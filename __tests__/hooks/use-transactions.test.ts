import { createSupabaseMock } from '../helpers/supabase-mock';

// jest.mock calls are hoisted above imports, so the mock factory can't close
// over an outer `supabase` variable — it has to require the helper itself.
jest.mock('@/lib/supabase', () => {
  const { createSupabaseMock } = require('../helpers/supabase-mock');
  (global as any).__supabaseMock = createSupabaseMock([]);
  return { supabase: (global as any).__supabaseMock.supabase };
});

jest.mock('@/hooks/use-platform-settings', () => ({
  getCommissionPct: jest.fn().mockResolvedValue(0.05),
}));

import {
  markFundsHeld,
  markCompletedByProvider,
  markConfirmedByCustomer,
  releaseFunds,
  raiseTransactionDispute,
  cancelTransaction,
  createTransaction,
} from '@/hooks/use-transactions';

function mockChainResults(results: { data: any; error: any }[]) {
  const mock = createSupabaseMock(results);
  (global as any).__supabaseMock.fromFn.mockImplementation(mock.fromFn);
  (global as any).__supabaseMock.chain = mock.chain;
  // Replace the live chain's methods on the shared mock object so the
  // already-wired `supabase.from` picks up the new queued results.
  Object.assign((global as any).__supabaseMock.supabase, { from: mock.fromFn });
}

describe('transaction state machine (hooks/use-transactions.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The whole point of ALLOWED_TRANSITIONS is that money can't skip steps —
  // these are the legal single-step moves the rest of the app relies on.
  const legalMoves = [
    { label: 'accepted -> funds_held', currentStatus: 'accepted', transitionFn: markFundsHeld, nextStatus: 'funds_held' },
    { label: 'funds_held -> completed_by_provider', currentStatus: 'funds_held', transitionFn: markCompletedByProvider, nextStatus: 'completed_by_provider' },
    { label: 'completed_by_provider -> confirmed_by_customer', currentStatus: 'completed_by_provider', transitionFn: markConfirmedByCustomer, nextStatus: 'confirmed_by_customer' },
    { label: 'confirmed_by_customer -> released', currentStatus: 'confirmed_by_customer', transitionFn: releaseFunds, nextStatus: 'released' },
    // The admin 72-hour release path — skips confirmed_by_customer entirely.
    { label: 'completed_by_provider -> released (admin release path)', currentStatus: 'completed_by_provider', transitionFn: releaseFunds, nextStatus: 'released' },
    { label: 'funds_held -> disputed', currentStatus: 'funds_held', transitionFn: raiseTransactionDispute, nextStatus: 'disputed' },
    { label: 'accepted -> cancelled', currentStatus: 'accepted', transitionFn: cancelTransaction, nextStatus: 'cancelled' },
  ] as const;

  it.each(legalMoves)('allows $label', async ({ currentStatus, transitionFn, nextStatus }) => {
    mockChainResults([
      { data: { status: currentStatus }, error: null }, // SELECT current status
      { data: { id: 'txn-1', status: nextStatus }, error: null }, // UPDATE
    ]);

    const result = await transitionFn('txn-1');
    expect(result.status).toBe(nextStatus);
  });

  // The cases that actually matter: these are moves the real payment flow
  // must never allow (e.g. marking a job complete before funds are held —
  // the exact bug this test suite was written after finding and fixing).
  const illegalMoves = [
    { label: 'quoted -> completed_by_provider', currentStatus: 'quoted', transitionFn: markCompletedByProvider, nextStatus: 'completed_by_provider' },
    { label: 'accepted -> completed_by_provider', currentStatus: 'accepted', transitionFn: markCompletedByProvider, nextStatus: 'completed_by_provider' },
    { label: 'released -> funds_held', currentStatus: 'released', transitionFn: markFundsHeld, nextStatus: 'funds_held' },
    { label: 'cancelled -> released', currentStatus: 'cancelled', transitionFn: releaseFunds, nextStatus: 'released' },
    { label: 'funds_held -> confirmed_by_customer', currentStatus: 'funds_held', transitionFn: markConfirmedByCustomer, nextStatus: 'confirmed_by_customer' },
  ] as const;

  it.each(illegalMoves)('rejects illegal transition $label', async ({ currentStatus, transitionFn, nextStatus }) => {
    mockChainResults([
      { data: { status: currentStatus }, error: null },
    ]);

    await expect(transitionFn('txn-1')).rejects.toThrow(
      `Illegal transaction transition: ${currentStatus} -> ${nextStatus}`
    );
  });

  it('throws if the transaction does not exist', async () => {
    mockChainResults([{ data: null, error: null }]);
    await expect(markFundsHeld('missing-txn')).rejects.toThrow('missing-txn');
  });

  it('propagates the Supabase error if the status fetch fails', async () => {
    const dbError = { message: 'connection reset' };
    mockChainResults([{ data: null, error: dbError }]);
    await expect(markFundsHeld('txn-1')).rejects.toEqual(dbError);
  });

  // The bug this fixes: handleRelease() in the payments screen used to call
  // markConfirmedByCustomer() BEFORE the TradeSafe 'accept' call — if that
  // external call then failed, the transaction was already stuck at
  // confirmed_by_customer, and every retry hit "illegal transition:
  // confirmed_by_customer -> confirmed_by_customer" forever, with no way to
  // recover. Treating X -> X as a successful no-op breaks that loop.
  it('is idempotent — a transition already at its target status succeeds as a no-op instead of throwing', async () => {
    mockChainResults([
      { data: { id: 'txn-1', status: 'confirmed_by_customer' }, error: null }, // SELECT current status
    ]);

    const result = await markConfirmedByCustomer('txn-1');
    expect(result.status).toBe('confirmed_by_customer');
  });

  it('new transactions always start at accepted, never funds_held', async () => {
    mockChainResults([
      { data: { id: 'txn-1', status: 'accepted', quoted_amount: 100 }, error: null },
    ]);

    const txn = await createTransaction({
      jobId: 'job-1',
      quoteId: 'quote-1',
      customerId: 'cust-1',
      tradieId: 'tradie-1',
      quotedAmount: 100,
    });

    expect(txn.status).toBe('accepted');
  });
});
