import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';
import { sendEmail } from '../_shared/resend.ts';
import { getPreviousReportPeriod, reportPeriodToApprovedAtRange, computeReportLines } from './logic.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const DIGEST_SECRET = Deno.env.get('MONTHLY_REPORT_SECRET');
const ADMIN_SITE_URL = Deno.env.get('ADMIN_SITE_URL') ?? 'https://admin-five-chi-53.vercel.app';
const TOKEN_VALIDITY_DAYS = 30;

// Triggered once a month (03:00 SAST on the 1st, migration 050) by pg_cron,
// same no-user-JWT / shared-secret-from-Vault setup as daily-review-digest.
// For each active supplier with qualifying activity in the PREVIOUS
// calendar month (by approved_at — see logic.ts), generates one
// supplier_reports row + one supplier_report_lines row per tradie, claims
// the underlying slips (report_line_id), and emails the supplier a link to
// confirm each tradie's credit as loaded.
//
// Idempotency is NOT "did the cron already run today" — it's the DB itself:
// supplier_reports' UNIQUE(supplier_id, period_start) means a second call
// for the same supplier+month hits a 23505 and is treated as already-done,
// and reward_slips.report_line_id being set the moment a slip is claimed
// means it can never be claimed by a second line even across two runs.
Deno.serve(async (req) => {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:monthly-report-generate`, { limit: 10, windowSeconds: 60 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

  if (!DIGEST_SECRET) {
    console.error('[monthly-report-generate] MONTHLY_REPORT_SECRET not configured');
    return new Response('Unauthorized', { status: 401 });
  }
  if (req.headers.get('x-digest-secret') !== DIGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { periodStart, periodEnd } = getPreviousReportPeriod(new Date());
  const { gte, lt } = reportPeriodToApprovedAtRange(periodStart, periodEnd);

  const { data: suppliers, error: suppliersErr } = await supabaseAdmin
    .from('suppliers')
    .select('id, name, reward_pct, commission_pct, report_emails')
    .eq('is_active', true);

  if (suppliersErr) {
    console.error('[monthly-report-generate] failed to load suppliers:', suppliersErr);
    return new Response(JSON.stringify({ error: suppliersErr.message }), { status: 500 });
  }

  const results: Array<{ supplierId: string; outcome: string; detail?: string }> = [];

  for (const supplier of suppliers ?? []) {
    try {
      const outcome = await generateForSupplier(supplier, periodStart, periodEnd, gte, lt);
      results.push({ supplierId: supplier.id, outcome });
    } catch (err) {
      console.error(`[monthly-report-generate] supplier ${supplier.id} failed:`, err);
      results.push({ supplierId: supplier.id, outcome: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(JSON.stringify({ periodStart, periodEnd, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function generateForSupplier(
  supplier: { id: string; name: string; reward_pct: number; commission_pct: number; report_emails: string[] },
  periodStart: string,
  periodEnd: string,
  approvedAtGte: string,
  approvedAtLt: string
): Promise<string> {
  // Checked BEFORE querying slips, not after: once a report exists, its
  // slips are already claimed (report_line_id set), so a slip-count check
  // alone can't tell "already reported this month" apart from "genuinely
  // no activity" — it would misreport the former as the latter.
  const { data: existingReport } = await supabaseAdmin
    .from('supplier_reports')
    .select('id')
    .eq('supplier_id', supplier.id)
    .eq('period_start', periodStart)
    .maybeSingle();
  if (existingReport) return 'skipped_already_generated';

  const { data: slips, error: slipsErr } = await supabaseAdmin
    .from('reward_slips')
    .select('id, tradie_id, total_amount, reward_amount')
    .eq('supplier_id', supplier.id)
    .eq('status', 'approved')
    .is('report_line_id', null)
    .gte('approved_at', approvedAtGte)
    .lt('approved_at', approvedAtLt);

  if (slipsErr) throw new Error(`load slips failed: ${slipsErr.message}`);
  if (!slips || slips.length === 0) return 'skipped_no_activity';

  const lines = computeReportLines(
    slips.map((s) => ({ id: s.id, tradie_id: s.tradie_id, total_amount: Number(s.total_amount), reward_amount: Number(s.reward_amount) })),
    Number(supplier.commission_pct)
  );

  const tokenExpiresAt = new Date(Date.now() + TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: report, error: reportErr } = await supabaseAdmin
    .from('supplier_reports')
    .insert({ supplier_id: supplier.id, period_start: periodStart, period_end: periodEnd, token_expires_at: tokenExpiresAt })
    .select('id, access_token')
    .single();

  if (reportErr) {
    // Still possible under a race (two overlapping invocations) even with
    // the check above — the UNIQUE constraint is the real guard; the
    // existence check above is just what makes the common case report
    // accurately.
    if ((reportErr as { code?: string }).code === '23505') return 'skipped_already_generated';
    throw new Error(`create report failed: ${reportErr.message}`);
  }

  const { data: accounts } = await supabaseAdmin
    .from('tradie_supplier_accounts')
    .select('tradie_id, account_number')
    .eq('supplier_id', supplier.id)
    .in('tradie_id', lines.map((l) => l.tradieId));
  const accountByTradie = new Map((accounts ?? []).map((a) => [a.tradie_id, a.account_number]));

  for (const line of lines) {
    const { data: insertedLine, error: lineErr } = await supabaseAdmin
      .from('supplier_report_lines')
      .insert({
        report_id: report.id,
        tradie_id: line.tradieId,
        account_number: accountByTradie.get(line.tradieId) ?? '',
        slip_count: line.slipCount,
        total_spend: line.totalSpend,
        reward_pct: supplier.reward_pct,
        credit_to_load: line.creditToLoad,
        commission_due: line.commissionDue,
      })
      .select('id')
      .single();

    if (lineErr) throw new Error(`create report line failed: ${lineErr.message}`);

    const { error: claimErr } = await supabaseAdmin
      .from('reward_slips')
      .update({ report_line_id: insertedLine.id })
      .in('id', line.slipIds);
    if (claimErr) throw new Error(`claim slips failed: ${claimErr.message}`);
  }

  if (supplier.report_emails && supplier.report_emails.length > 0) {
    const confirmUrl = `${ADMIN_SITE_URL}/reports/confirm/${report.access_token}`;
    const totalCredit = lines.reduce((sum, l) => sum + l.creditToLoad, 0).toFixed(2);
    await sendEmail({
      to: supplier.report_emails,
      subject: `TrustaTradie: ${periodStart.slice(0, 7)} reward report — ${lines.length} tradie${lines.length === 1 ? '' : 's'}, R${totalCredit} to load`,
      html: `
        <p>Your TrustaTradie rewards report for ${periodStart} to ${periodEnd} is ready: ${lines.length} tradie${lines.length === 1 ? '' : 's'}, R${totalCredit} total credit to load.</p>
        <p><a href="${confirmUrl}">View the report and confirm each tradie's credit as loaded</a></p>
        <p>This link is valid for ${TOKEN_VALIDITY_DAYS} days.</p>
      `,
    });
    await supabaseAdmin.from('supplier_reports').update({ sent_at: new Date().toISOString() }).eq('id', report.id);
  }

  return 'generated';
}
