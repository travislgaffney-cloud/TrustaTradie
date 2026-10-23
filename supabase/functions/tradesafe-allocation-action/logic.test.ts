import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isValidAction, getExpectedCaller, isAuthorizedCaller, ADMIN_ONLY_ACTIONS } from './logic.ts';

const TXN = { tradie_id: 'tradie-1', customer_id: 'customer-1' };

Deno.test('isValidAction - accepts the five real actions', () => {
  assertEquals(isValidAction('start'), true);
  assertEquals(isValidAction('complete'), true);
  assertEquals(isValidAction('accept'), true);
  assertEquals(isValidAction('dispute'), true);
  assertEquals(isValidAction('cancel'), true);
});

Deno.test('ADMIN_ONLY_ACTIONS - cancel is admin-only; nothing else is', () => {
  assertEquals(ADMIN_ONLY_ACTIONS.includes('cancel'), true);
  assertEquals(ADMIN_ONLY_ACTIONS.includes('start'), false);
  assertEquals(ADMIN_ONLY_ACTIONS.includes('complete'), false);
  assertEquals(ADMIN_ONLY_ACTIONS.includes('accept'), false);
  assertEquals(ADMIN_ONLY_ACTIONS.includes('dispute'), false);
});

Deno.test('isValidAction - rejects anything else, including near-misses', () => {
  assertEquals(isValidAction('completed'), false);
  assertEquals(isValidAction('Complete'), false);
  assertEquals(isValidAction(''), false);
  assertEquals(isValidAction(undefined), false);
  assertEquals(isValidAction(null), false);
  assertEquals(isValidAction(123), false);
});

Deno.test('getExpectedCaller - "start" and "complete" (seller moves) belong to the tradie', () => {
  assertEquals(getExpectedCaller('start', TXN), 'tradie-1');
  assertEquals(getExpectedCaller('complete', TXN), 'tradie-1');
});

Deno.test('getExpectedCaller - "accept" and "dispute" (buyer moves) belong to the customer', () => {
  assertEquals(getExpectedCaller('accept', TXN), 'customer-1');
  assertEquals(getExpectedCaller('dispute', TXN), 'customer-1');
});

// This is the actual security boundary: the whole route trusts this
// function to decide who's allowed to trigger a real TradeSafe mutation.
Deno.test('isAuthorizedCaller - the tradie can start and mark their own job complete', () => {
  assertEquals(isAuthorizedCaller('tradie-1', 'start', TXN), true);
  assertEquals(isAuthorizedCaller('tradie-1', 'complete', TXN), true);
});

Deno.test('isAuthorizedCaller - the customer CANNOT start or mark the job complete on the tradie\'s behalf', () => {
  assertEquals(isAuthorizedCaller('customer-1', 'start', TXN), false);
  assertEquals(isAuthorizedCaller('customer-1', 'complete', TXN), false);
});

Deno.test('isAuthorizedCaller - the customer can accept/dispute their own transaction', () => {
  assertEquals(isAuthorizedCaller('customer-1', 'accept', TXN), true);
  assertEquals(isAuthorizedCaller('customer-1', 'dispute', TXN), true);
});

Deno.test('isAuthorizedCaller - the tradie CANNOT accept or dispute on the customer\'s behalf', () => {
  assertEquals(isAuthorizedCaller('tradie-1', 'accept', TXN), false);
  assertEquals(isAuthorizedCaller('tradie-1', 'dispute', TXN), false);
});

Deno.test('isAuthorizedCaller - a third party (neither side of the transaction) is never authorized', () => {
  assertEquals(isAuthorizedCaller('some-other-user', 'complete', TXN), false);
  assertEquals(isAuthorizedCaller('some-other-user', 'accept', TXN), false);
  assertEquals(isAuthorizedCaller('some-other-user', 'dispute', TXN), false);
});
