import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';
import { evaluateSlip, isNearDuplicateHash } from './logic.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function notifyUser(userId: string, type: string, title: string, body: string, data?: Record<string, string>) {
  await supabaseAdmin.from('notifications').insert({ user_id: userId, type, title, body, data: data ?? null, is_read: false });

  const { data: profile } = await supabaseAdmin.from('profiles').select('push_token').eq('id', userId).single();
  if (!profile?.push_token) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: profile.push_token, title, body, data: { ...data, type }, sound: 'default', priority: 'high', channelId: 'default' }),
    });
  } catch (e) {
    console.warn('[reward-slip-evaluate] push failed silently:', e);
  }
}

// Called by the app right after a tradie inserts a reward_slips row — every
// insert lands at 'pending' (enforced by RLS, migration 046), and this
// function is the only thing that ever moves it to 'approved' or
// 'rejected'. Runs server-side with the service-role client specifically so
// a client can never self-approve a reward by sending a crafted request.
Deno.serve(async (req) => {
  try {
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:reward-slip-evaluate`, { limit: 30, windowSeconds: 300 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const userLimit = await checkRateLimit(supabaseAdmin, `user:${caller.id}:reward-slip-evaluate`, { limit: 20, windowSeconds: 300 });
    if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterSeconds);

    const { slipId } = (await req.json()) as { slipId?: string };
    if (!slipId) return new Response(JSON.stringify({ error: 'Missing slipId' }), { status: 400 });

    const { data: slip } = await supabaseAdmin
      .from('reward_slips')
      .select('id, tradie_id, supplier_id, slip_number, slip_date, total_amount, image_hash, ocr_supplier_name, ocr_total, ocr_date, ocr_confidence, status')
      .eq('id', slipId)
      .single();

    if (!slip) return new Response(JSON.stringify({ error: 'Slip not found' }), { status: 404 });
    if (slip.tradie_id !== caller.id) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    if (slip.status !== 'pending') {
      // Already evaluated (e.g. a retried request) — nothing to do, not an error.
      return new Response(JSON.stringify({ outcome: slip.status }), { headers: { 'Content-Type': 'application/json' } });
    }

    const [{ data: supplier }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('suppliers').select('name, reward_pct, min_slip_amount').eq('id', slip.supplier_id).single(),
      supabaseAdmin.from('platform_settings').select('reward_auto_approve_threshold, reward_slip_max_age_days').eq('id', true).single(),
    ]);
    if (!supplier || !settings) {
      return new Response(JSON.stringify({ error: 'Could not load supplier or settings' }), { status: 500 });
    }

    // Exact (supplier_id, slip_number) duplicates are already impossible —
    // migration 045's unique index rejects the insert outright — so this is
    // only ever checking for an image reused across a DIFFERENT supplier.
    let nearDuplicateImageHash = false;
    if (slip.image_hash) {
      const { data: otherSlips } = await supabaseAdmin
        .from('reward_slips')
        .select('image_hash')
        .not('image_hash', 'is', null)
        .neq('id', slip.id);
      const hashes = (otherSlips ?? []).map((s) => s.image_hash as string);
      nearDuplicateImageHash = isNearDuplicateHash(slip.image_hash, hashes);
    }

    const result = evaluateSlip({
      slip: {
        totalAmount: Number(slip.total_amount),
        slipDate: slip.slip_date,
        ocrSupplierName: slip.ocr_supplier_name,
        ocrTotal: slip.ocr_total !== null ? Number(slip.ocr_total) : null,
        ocrDate: slip.ocr_date,
        ocrConfidence: slip.ocr_confidence !== null ? Number(slip.ocr_confidence) : null,
      },
      supplier: {
        name: supplier.name,
        rewardPct: Number(supplier.reward_pct),
        minSlipAmount: Number(supplier.min_slip_amount),
      },
      settings: {
        autoApproveThreshold: Number(settings.reward_auto_approve_threshold),
        maxAgeDays: Number(settings.reward_slip_max_age_days),
      },
      now: new Date(),
      duplicate: { exactDuplicateExists: false, nearDuplicateImageHash },
    });

    if (result.outcome === 'approved') {
      await supabaseAdmin
        .from('reward_slips')
        .update({
          status: 'approved',
          reward_pct_locked: result.rewardPctLocked,
          reward_amount: result.rewardAmount,
          approved_at: new Date().toISOString(),
        })
        .eq('id', slip.id);

      await notifyUser(
        slip.tradie_id,
        'reward_slip_approved',
        'Slip Approved',
        `Your till slip for "${supplier.name}" was approved — R${result.rewardAmount?.toFixed(2)} reward earned.`,
        { slip_id: slip.id }
      );
    } else if (result.outcome === 'rejected') {
      await supabaseAdmin
        .from('reward_slips')
        .update({ status: 'rejected', rejected_reason: result.rejectReason })
        .eq('id', slip.id);

      await notifyUser(
        slip.tradie_id,
        'reward_slip_rejected',
        'Slip Rejected',
        result.rejectReason ?? 'Your till slip was rejected.',
        { slip_id: slip.id }
      );
    } else {
      await supabaseAdmin
        .from('reward_slips')
        .update({ flagged_reason: result.flaggedReasons.join(', ') })
        .eq('id', slip.id);
      // Stays 'pending' — no notification yet; the tradie already saw
      // "submitted" feedback, and the admin review queue is where this
      // surfaces next.
    }

    return new Response(JSON.stringify({ outcome: result.outcome, flaggedReasons: result.flaggedReasons }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('reward-slip-evaluate error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});
