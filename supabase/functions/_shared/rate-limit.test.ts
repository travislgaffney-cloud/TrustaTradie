import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkRateLimit, rateLimitResponse, getClientIp } from './rate-limit.ts';

function fakeSupabase(result: { data: any; error: any }) {
  return { rpc: (_fn: string, _args: unknown) => Promise.resolve(result) } as any;
}

Deno.test('checkRateLimit - allows the request when the RPC says allowed', async () => {
  const supabase = fakeSupabase({ data: [{ allowed: true, current_count: 2, retry_after_seconds: 30 }], error: null });
  const result = await checkRateLimit(supabase, 'user:1:fn', { limit: 5, windowSeconds: 60 });
  assertEquals(result.allowed, true);
});

Deno.test('checkRateLimit - blocks the request and surfaces retry_after_seconds when the RPC says not allowed', async () => {
  const supabase = fakeSupabase({ data: [{ allowed: false, current_count: 6, retry_after_seconds: 17 }], error: null });
  const result = await checkRateLimit(supabase, 'user:1:fn', { limit: 5, windowSeconds: 60 });
  assertEquals(result.allowed, false);
  assertEquals(result.retryAfterSeconds, 17);
});

Deno.test('checkRateLimit - fails OPEN (allows the request) if the RPC call itself errors', async () => {
  const supabase = fakeSupabase({ data: null, error: { message: 'connection reset' } });
  const result = await checkRateLimit(supabase, 'user:1:fn', { limit: 5, windowSeconds: 60 });
  // A rate-limit infra failure must never be the reason a real
  // checkout/payment/webhook request gets rejected.
  assertEquals(result.allowed, true);
});

Deno.test('rateLimitResponse - returns 429 with a Retry-After header matching the given seconds', async () => {
  const res = rateLimitResponse(42);
  assertEquals(res.status, 429);
  assertEquals(res.headers.get('Retry-After'), '42');
  const body = await res.json();
  assertEquals(typeof body.error, 'string');
});

Deno.test('getClientIp - reads the first address out of a comma-separated x-forwarded-for', () => {
  const req = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
  });
  assertEquals(getClientIp(req), '203.0.113.5');
});

Deno.test('getClientIp - falls back to x-real-ip, then to a constant rather than throwing', () => {
  const withRealIp = new Request('https://example.com', { headers: { 'x-real-ip': '198.51.100.9' } });
  assertEquals(getClientIp(withRealIp), '198.51.100.9');

  const withNeither = new Request('https://example.com');
  assertEquals(getClientIp(withNeither), 'unknown');
});
