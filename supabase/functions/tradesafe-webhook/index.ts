import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { timingSafeEqual, resolveNextStatus, canApplyTransition } from './logic.ts';
import { checkRateLimit, rateLimitResponse, getClientIp } from '../_shared/rate-limit.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// TradeSafe doesn't sign callbacks — verification is IP allowlisting (out of
// scope here) plus a secret embedded directly in the callback URL, which is
// what we check below. Register this exact path (with the real secret) as
// the "Transaction Update Callback URL" in TradeSafe's app settings.
const WEBHOOK_SECRET = Deno.env.get('TRADESAFE_WEBHOOK_SECRET');

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
    console.warn('[tradesafe-webhook] push failed silently:', e);
  }
}

Deno.serve(async (req) => {
  // Fail closed on misconfiguration — an unset secret must never fall
  // through to comparing undefined against undefined and matching.
  if (!WEBHOOK_SECRET) {
    console.error('[tradesafe-webhook] TRADESAFE_WEBHOOK_SECRET is not configured');
    return new Response('Unauthorized', { status: 401 });
  }

  // No user/auth concept here — this is an inbound webhook authenticated
  // only by the URL secret, so IP is the only signal available. Checked
  // before the secret comparison so a leaked/guessed secret still can't be
  // used to flood this endpoint unboundedly.
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(supabaseAdmin, `ip:${ip}:tradesafe-webhook`, { limit: 60, windowSeconds: 60 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

  const url = new URL(req.url);
  const pathSecret = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const querySecret = url.searchParams.get('secret') ?? '';

  if (!timingSafeEqual(pathSecret, WEBHOOK_SECRET) && !timingSafeEqual(querySecret, WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // TradeSafe's docs example wraps the payload as { url, data: {...} }; be
  // defensive and accept either that or a flat payload.
  const payload = body?.data ?? body;
  const tradesafeId: string | undefined = typeof payload?.id === 'string' ? payload.id : undefined;
  const state: string | undefined = typeof payload?.state === 'string' ? payload.state : undefined;

  if (!tradesafeId || !state) {
    return new Response('Missing id/state', { status: 400 });
  }

  const { data: txn } = await supabaseAdmin
    .from('transactions')
    .select('id, job_id, customer_id, tradie_id, status')
    .eq('tradesafe_transaction_id', tradesafeId)
    .maybeSingle();

  if (!txn) {
    // Not one of ours (or not yet linked) — acknowledge so TradeSafe doesn't retry forever.
    return new Response(JSON.stringify({ received: true, matched: false }), { status: 200 });
  }

  const nextStatus = resolveNextStatus(state);
  if (!nextStatus) {
    console.log(`[tradesafe-webhook] state ${state} has no internal mapping, txn ${txn.id} left at ${txn.status}`);
    return new Response(JSON.stringify({ received: true, matched: true, applied: false }), { status: 200 });
  }

  if (!canApplyTransition(txn.status, nextStatus)) {
    console.warn(`[tradesafe-webhook] illegal transition ${txn.status} -> ${nextStatus} for txn ${txn.id}, ignoring`);
    return new Response(JSON.stringify({ received: true, matched: true, applied: false, reason: 'illegal transition' }), { status: 200 });
  }

  await supabaseAdmin.from('transactions').update({ status: nextStatus }).eq('id', txn.id);

  if (nextStatus === 'funds_held') {
    // Nothing else notifies the tradie that payment actually landed — the
    // customer's own screen just shows a success page, this is the tradie's
    // only signal that they can start the job.
    await notifyUser(
      txn.tradie_id,
      'quote_accepted',
      'Payment Received',
      'The customer has paid — funds are held in escrow. You can start the job.',
      { job_id: txn.job_id }
    );
  }

  if (nextStatus === 'released') {
    await supabaseAdmin.from('jobs').update({ status: 'completed' }).eq('id', txn.job_id);
    await notifyUser(
      txn.tradie_id,
      'payment_released',
      'Payment Released',
      'Funds have been released to your account.',
      { job_id: txn.job_id }
    );
  }

  if (nextStatus === 'cancelled') {
    // Disputed-only handles its own notifications client-side (raised by the
    // customer, who already sees the confirmation in-app) — this covers the
    // case where TradeSafe cancels a transaction independently of that flow.
    await notifyUser(
      txn.customer_id,
      'job_completed',
      'Transaction Cancelled',
      'Your job payment was cancelled.',
      { job_id: txn.job_id }
    );
    await notifyUser(
      txn.tradie_id,
      'job_completed',
      'Transaction Cancelled',
      'The job payment was cancelled.',
      { job_id: txn.job_id }
    );
  }

  return new Response(JSON.stringify({ received: true, matched: true, applied: true, status: nextStatus }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
