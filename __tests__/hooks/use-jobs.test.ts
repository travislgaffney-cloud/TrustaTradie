const mockGetTransactionByJobId = jest.fn();
const mockMarkCompletedByProvider = jest.fn();
const mockNotifyUser = jest.fn().mockResolvedValue(undefined);
const mockInvoke = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/hooks/use-transactions', () => ({
  getTransactionByJobId: (...args: any[]) => mockGetTransactionByJobId(...args),
  markCompletedByProvider: (...args: any[]) => mockMarkCompletedByProvider(...args),
}));

jest.mock('@/lib/notifications', () => ({
  notifyUser: (...args: any[]) => mockNotifyUser(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('@/hooks/use-refresh-on-focus', () => ({ useRefreshOnFocus: jest.fn() }));
jest.mock('@/lib/storage', () => ({ uploadFile: jest.fn() }));
jest.mock('@/store/auth-store', () => ({ useAuthStore: jest.fn() }));

import { completeJob } from '@/hooks/use-jobs';

// completeJob() had a real bug this session: it updated jobs.status before
// validating the transaction could legally move to completed_by_provider, so
// a rejection left the job stuck at 'pending_completion' while the
// transaction never left 'accepted'. These tests pin the fixed behavior:
// the funds_held check happens first, and nothing in `jobs` gets touched
// unless it passes.
describe('completeJob (hooks/use-jobs.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default happy path for the `jobs` update chain used after the guard passes.
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { title: 'Fix tap', customer_id: 'cust-1' } }) }),
      }),
    });
  });

  it('refuses to complete when there is no transaction at all', async () => {
    mockGetTransactionByJobId.mockResolvedValue(null);

    await expect(completeJob('job-1', 'tradie-1')).rejects.toThrow(
      "Payment hasn't been confirmed as held in escrow yet"
    );
    expect(mockMarkCompletedByProvider).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('refuses to complete when the transaction is still at accepted (not yet paid)', async () => {
    mockGetTransactionByJobId.mockResolvedValue({ id: 'txn-1', status: 'accepted', tradesafe_allocation_id: null });

    await expect(completeJob('job-1', 'tradie-1')).rejects.toThrow(
      "Payment hasn't been confirmed as held in escrow yet"
    );
    // Regression guard for the real bug: jobs.status must never be touched
    // when this check fails.
    expect(mockFrom).not.toHaveBeenCalledWith('jobs');
    expect(mockMarkCompletedByProvider).not.toHaveBeenCalled();
  });

  it('completes successfully once funds are held, and updates jobs only after the ledger transition', async () => {
    mockGetTransactionByJobId.mockResolvedValue({ id: 'txn-1', status: 'funds_held', tradesafe_allocation_id: null });
    mockMarkCompletedByProvider.mockResolvedValue({ id: 'txn-1', status: 'completed_by_provider' });

    await completeJob('job-1', 'tradie-1');

    expect(mockMarkCompletedByProvider).toHaveBeenCalledWith('txn-1');
    expect(mockFrom).toHaveBeenCalledWith('jobs');
    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'cust-1', type: 'job_completed' })
    );
  });

  it('calls the TradeSafe allocation action when one is linked, and aborts on its error without touching jobs', async () => {
    mockGetTransactionByJobId.mockResolvedValue({ id: 'txn-1', status: 'funds_held', tradesafe_allocation_id: 'alloc-1' });
    mockInvoke.mockResolvedValue({ data: { error: 'Allocation not funded' }, error: null });

    await expect(completeJob('job-1', 'tradie-1')).rejects.toThrow('Allocation not funded');

    expect(mockInvoke).toHaveBeenCalledWith('tradesafe-allocation-action', {
      body: { jobId: 'job-1', action: 'complete' },
    });
    expect(mockMarkCompletedByProvider).not.toHaveBeenCalled();
  });
});
