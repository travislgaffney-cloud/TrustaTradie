import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { timingSafeEqual, resolveNextStatus, canApplyTransition } from './logic.ts';

Deno.test('timingSafeEqual - matches identical strings', () => {
  assertEquals(timingSafeEqual('a-real-secret', 'a-real-secret'), true);
});

Deno.test('timingSafeEqual - rejects a wrong guess of the same length', () => {
  assertEquals(timingSafeEqual('a-real-secret', 'a-reat-secret'), false);
});

Deno.test('timingSafeEqual - rejects different lengths without throwing', () => {
  assertEquals(timingSafeEqual('short', 'a-much-longer-guess'), false);
});

Deno.test('timingSafeEqual - empty strings only match each other', () => {
  assertEquals(timingSafeEqual('', ''), true);
  assertEquals(timingSafeEqual('', 'x'), false);
});

Deno.test('resolveNextStatus - maps every TradeSafe money state to our internal status', () => {
  assertEquals(resolveNextStatus('FUNDS_RECEIVED'), 'funds_held');
  assertEquals(resolveNextStatus('FUNDS_RELEASED'), 'released');
  assertEquals(resolveNextStatus('CANCELED'), 'cancelled');
  assertEquals(resolveNextStatus('DECLINED'), 'cancelled');
  assertEquals(resolveNextStatus('ABANDONED'), 'cancelled');
  assertEquals(resolveNextStatus('DISPUTED'), 'disputed');
});

Deno.test('resolveNextStatus - an unmapped state (job-progress states) resolves to null, not a guess', () => {
  assertEquals(resolveNextStatus('COMPLETED_BY_PROVIDER'), null);
  assertEquals(resolveNextStatus('SOME_UNKNOWN_FUTURE_STATE'), null);
});

Deno.test('canApplyTransition - allows every legal single-step move', () => {
  assertEquals(canApplyTransition('accepted', 'funds_held'), true);
  assertEquals(canApplyTransition('funds_held', 'completed_by_provider'), true);
  assertEquals(canApplyTransition('funds_held', 'disputed'), true);
  assertEquals(canApplyTransition('disputed', 'funds_held'), true);
});

Deno.test('canApplyTransition - rejects a TradeSafe webhook trying to skip or rewind state', () => {
  // A webhook delivered out of order (or replayed) must not be able to move
  // a transaction backwards or skip a step — this is the guard that makes
  // the webhook idempotent/order-safe.
  assertEquals(canApplyTransition('released', 'funds_held'), false);
  assertEquals(canApplyTransition('quoted', 'released'), false);
  assertEquals(canApplyTransition('cancelled', 'funds_held'), false);
});

Deno.test('canApplyTransition - terminal states accept nothing further', () => {
  assertEquals(canApplyTransition('released', 'disputed'), false);
  assertEquals(canApplyTransition('cancelled', 'disputed'), false);
});
