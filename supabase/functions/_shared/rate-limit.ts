// Shared rate limiting for every edge function, backed by the `rate_limits`
// table + check_rate_limit() RPC (see migration 040). Fixed-window per
// (key, window) counter, incremented atomically on the DB side so
// concurrent requests can't race past the limit.
//
// Usage: call checkRateLimit() once per caller-scoped key you want to
// guard (typically one IP-based call and, once the caller is known, one
// user-based call). If either is exceeded, return rateLimitResponse().
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: key,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    // Fail OPEN — a rate-limit infra error must never be the reason a
    // legitimate checkout/payment/webhook call fails. This is a defense
    // layer, not a business requirement.
    console.error(`[rate-limit] check failed for "${key}", allowing request:`, error.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const row = data?.[0];
  return {
    allowed: row?.allowed ?? true,
    retryAfterSeconds: row?.retry_after_seconds ?? 0,
  };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

// Supabase Edge Functions run behind a proxy that sets this; falls back to
// a constant string (which still rate-limits — just as a single shared
// bucket) if it's ever missing rather than throwing.
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
