// Pure, DB-free logic extracted from index.ts so the authorization check —
// the single thing standing between "tradie marks their own job complete"
// and "tradie marks ANY job complete" — can be unit tested directly.

export type Action = 'start' | 'complete' | 'accept' | 'dispute';

export const VALID_ACTIONS: readonly Action[] = ['start', 'complete', 'accept', 'dispute'];

export function isValidAction(action: unknown): action is Action {
  return typeof action === 'string' && (VALID_ACTIONS as readonly string[]).includes(action);
}

// 'start' (allocationStartDelivery) and 'complete' (allocationCompleteDelivery)
// are the seller's moves — only the tradie on this transaction may call them.
// 'accept' and 'dispute' are the buyer's moves — only the customer may call those.
export function getExpectedCaller(
  action: Action,
  txn: { tradie_id: string; customer_id: string }
): string {
  return action === 'start' || action === 'complete' ? txn.tradie_id : txn.customer_id;
}

export function isAuthorizedCaller(
  callerId: string,
  action: Action,
  txn: { tradie_id: string; customer_id: string }
): boolean {
  return callerId === getExpectedCaller(action, txn);
}
