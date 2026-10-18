import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const DIGEST_SECRET = Deno.env.get('DAILY_DIGEST_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ALERT_EMAIL = Deno.env.get('DIGEST_ALERT_EMAIL') ?? 'travislgaffney@gmail.com';
const ADMIN_SITE_URL = Deno.env.get('ADMIN_SITE_URL') ?? 'https://admin-five-chi-53.vercel.app';
const FROM_ADDRESS = Deno.env.get('DIGEST_FROM_ADDRESS') ?? 'TrustaTradie Admin Alerts <onboarding@resend.dev>';

// Triggered once a day at 17:00 SAST by pg_cron (migration 048), not by a
// user — there's no Supabase JWT to verify here (deployed with
// --no-verify-jwt, same as tradesafe-webhook), so the caller authenticates
// with a shared secret instead, pulled from Supabase Vault at schedule time
// so the value itself never lands in a migration file or git history.
//
// Reports only items that arrived TODAY (SAST) and are still awaiting a
// decision — "accumulated in the day", not the whole backlog — and sends
// nothing at all when there's nothing to review.
Deno.serve(async (req) => {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:daily-review-digest`, { limit: 10, windowSeconds: 60 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

  if (!DIGEST_SECRET) {
    console.error('[daily-review-digest] DAILY_DIGEST_SECRET not configured');
    return new Response('Unauthorized', { status: 401 });
  }
  if (req.headers.get('x-digest-secret') !== DIGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // South Africa has no DST, so SAST is a fixed UTC+2 offset — this finds
  // the UTC instant for 00:00 SAST "today" relative to now.
  const now = new Date();
  const sastShifted = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayStartSAST = new Date(
    Date.UTC(sastShifted.getUTCFullYear(), sastShifted.getUTCMonth(), sastShifted.getUTCDate()) - 2 * 60 * 60 * 1000
  );

  const [{ count: docCount, error: docErr }, { count: slipCount, error: slipErr }] = await Promise.all([
    supabaseAdmin
      .from('tradie_documents')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false)
      .gte('created_at', todayStartSAST.toISOString()),
    supabaseAdmin
      .from('reward_slips')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('created_at', todayStartSAST.toISOString()),
  ]);

  if (docErr || slipErr) {
    console.error('[daily-review-digest] query failed:', docErr ?? slipErr);
    return new Response(JSON.stringify({ error: (docErr ?? slipErr)?.message }), { status: 500 });
  }

  const docs = docCount ?? 0;
  const slips = slipCount ?? 0;

  if (docs === 0 && slips === 0) {
    return new Response(JSON.stringify({ sent: false, reason: 'nothing pending today', docs, slips }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!RESEND_API_KEY) {
    console.error('[daily-review-digest] RESEND_API_KEY not configured — would have sent an alert for', { docs, slips });
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured', docs, slips }), { status: 500 });
  }

  const total = docs + slips;
  const lines: string[] = [];
  if (docs > 0) {
    lines.push(`<li><a href="${ADMIN_SITE_URL}/documents">${docs} document${docs === 1 ? '' : 's'}</a> awaiting verification</li>`);
  }
  if (slips > 0) {
    lines.push(`<li><a href="${ADMIN_SITE_URL}/rewards/review">${slips} reward slip${slips === 1 ? '' : 's'}</a> awaiting review</li>`);
  }

  const emailResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ALERT_EMAIL],
      subject: `TrustaTradie: ${total} item${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} review today`,
      html: `<p>Today's pending items on TrustaTradie admin:</p><ul>${lines.join('')}</ul>`,
    }),
  });

  if (!emailResp.ok) {
    const errText = await emailResp.text();
    console.error('[daily-review-digest] Resend send failed:', errText);
    return new Response(JSON.stringify({ error: 'Email send failed', detail: errText }), { status: 502 });
  }

  return new Response(JSON.stringify({ sent: true, docs, slips }), { headers: { 'Content-Type': 'application/json' } });
});
