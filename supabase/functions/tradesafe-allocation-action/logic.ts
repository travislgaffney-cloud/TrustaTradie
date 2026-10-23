// Pure, DB-free logic extracted from index.ts so the authorization check —
// the single thing standing between "tradie marks their own job complete"
// and "tradie marks ANY job complete" — can be unit tested directly.

export type Action = 'start' | 'complete' | 'accept' | 'dispute' | 'cancel';

export const VALID_ACTIONS: readonly Action[] = ['start', 'complete', 'accept', 'dispute', 'cancel'];

// 'cancel' (transactionCancel) is how admin resolves a dispute by refunding
// the customer — there's no legitimate customer/tradie flow for it, only the
// admin dashboard calling in with the admin's own session token, which
// index.ts checks against the real `admins` table before ever reaching
// isAuthorizedCaller below.
export const ADMIN_ONLY_ACTIONS: readonly Action[] = ['cancel'];

export function isValidAction(action: unknown): action is Action {
  return typeof action === 'string' && (VALID_ACTIONS as readonly string[]).includes(action);
}

// 'start' (allocationStartDelivery) and 'complete' (allocationCompleteDelivery)
// are the seller's moves — only the tradie on this transaction may call them.
// 'accept' and 'dispute' are the buyer's moves — only the customer may call
// those. 'cancel' is admin-only (see ADMIN_ONLY_ACTIONS) and never reaches
// this check in practice, so it has no meaningful "expected caller" — the
// customer_id fallback here is unreachable, not a real authorization claim.
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
