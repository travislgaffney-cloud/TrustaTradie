// Pure, DB-free logic extracted from index.ts so the highest-risk part of
// this webhook — signature verification and the state-transition guard —
// can be unit tested without a live Supabase client or Deno.serve.

// Plain !== is a variable-time comparison (bails on the first mismatched
// byte), which leaks how many leading characters of a guess were correct
// through response timing. The secret sits in a URL, which gets logged by
// proxies/CDNs far more readily than a header would, so treat guessing it
// as a real threat model, not a theoretical one.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Only the money-truth states get mapped onto our internal ledger — job
// progress states (completed_by_provider, confirmed_by_customer) stay driven
// by the app's own buttons, not the webhook, to avoid two sources of truth
// fighting over the same transition.
export const STATE_TO_STATUS: Record<string, string> = {
  FUNDS_RECEIVED: 'funds_held',
  FUNDS_RELEASED: 'released',
  CANCELED: 'cancelled',
  DECLINED: 'cancelled',
  ABANDONED: 'cancelled',
  DISPUTED: 'disputed',
  DISPUTED_EXTENDED: 'disputed',
  DISPUTED_RENEGOTIATE: 'disputed',
};

// Mirrors hooks/use-transactions.ts ALLOWED_TRANSITIONS — duplicated here
// because this runs in Deno, not the app's RN runtime. Keep both in sync.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  quoted: ['accepted', 'cancelled'],
  accepted: ['funds_held', 'cancelled'],
  funds_held: ['completed_by_provider', 'disputed', 'cancelled'],
  completed_by_provider: ['confirmed_by_customer', 'disputed'],
  confirmed_by_customer: ['released', 'disputed'],
  released: [],
  disputed: ['funds_held', 'released', 'cancelled'],
  cancelled: [],
};

export function resolveNextStatus(webhookState: string): string | null {
  return STATE_TO_STATUS[webhookState] ?? null;
}

export function canApplyTransition(currentStatus: string, nextStatus: string): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}
