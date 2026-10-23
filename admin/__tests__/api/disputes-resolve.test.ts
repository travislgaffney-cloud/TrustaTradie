import { createSupabaseTableMock } from '../helpers/supabase-mock';

let supabaseMock: ReturnType<typeof createSupabaseTableMock>;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return supabaseMock.supabase;
  },
}));

const REAL_ADMIN = { id: 'real-admin-42', email: 'admin@trustatradie.com' };

// getCurrentAdmin() calls next/headers' cookies(), which only works inside a
// real Next.js request context, so it's mocked here. Every request reaching
// this route is guaranteed (by middleware) to have a real admin session —
// defaulting the mock to a real admin keeps the other tests representative
// of that.
const mockGetCurrentAdmin = jest.fn().mockResolvedValue(REAL_ADMIN);
const mockGetCurrentAdminAccessToken = jest.fn().mockResolvedValue('real-admin-session-token');
jest.mock('@/lib/supabase-server', () => ({
  getCurrentAdmin: () => mockGetCurrentAdmin(),
  getCurrentAdminAccessToken: () => mockGetCurrentAdminAccessToken(),
}));

const mockLogAdminAction = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/audit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

function setupSupabase(tables: Parameters<typeof createSupabaseTableMock>[0]) {
  supabaseMock = createSupabaseTableMock(tables);
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/disputes/resolve', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const NOTE_ROW = { id: 'note-1', job_id: 'job-1', note: 'Looked into it', admin: { full_name: 'Site Admin' } };
const TXN = { id: 'txn-1', customer_id: 'cust-1', tradie_id: 'tradie-1', status: 'disputed' };

// This route is where an admin's dispute decision actually moves money. It
// maps a 3-way admin action to both jobs.status and transactions.status, and
// — for marked_completed/marked_cancelled — also calls the
// tradesafe-allocation-action edge function (best-effort; a rejected or
// failed call doesn't block the ledger update, same pattern as
// payment-releases/release). global.fetch is mocked to `{ ok: true }` by
// default here, so these tests aren't exercising TradeSafe's real response
// shape — see tradesafe-allocation-action's own tests for that. These tests
// pin the three action -> status mappings and guard against regressing the
// "no session" / "no note" failure paths.
describe('POST /api/disputes/resolve', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(REAL_ADMIN);
    mockGetCurrentAdminAccessToken.mockResolvedValue('real-admin-session-token');
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('rejects a request with no jobId or note', async () => {
    setupSupabase({});
    const { POST } = await import('@/app/api/disputes/resolve/route');
    const res = await POST(makeRequest({ jobId: 'job-1' }));
    expect(res.status).toBe(400);
  });

  it('rejects with 401 when there is no admin session', async () => {
    mockGetCurrentAdmin.mockResolvedValueOnce(null);
    setupSupabase({});
    const { POST } = await import('@/app/api/disputes/resolve/route');
    const res = await POST(makeRequest({ jobId: 'job-1', note: 'test' }));
    expect(res.status).toBe(401);
  });

  it.each([
    ['reverted_to_in_progress', 'in_progress', 'funds_held'],
    ['marked_completed', 'completed', 'released'],
    ['marked_cancelled', 'cancelled', 'cancelled'],
  ])('action=%s sets jobs.status=%s and transactions.status=%s', async (action, jobStatus, txnStatus) => {
    setupSupabase({
      profiles: { data: { push_token: null }, error: null },
      dispute_notes: { data: NOTE_ROW, error: null },
      transactions: { data: TXN, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    await POST(makeRequest({ jobId: 'job-1', note: 'resolved', action }));

    const jobsChain = supabaseMock.fromFn.mock.results.find(
      (_, i) => supabaseMock.fromFn.mock.calls[i][0] === 'jobs'
    )?.value;
    expect(jobsChain.update).toHaveBeenCalledWith({ status: jobStatus });

    const txnCalls = supabaseMock.fromFn.mock.calls
      .map((call, i) => ({ call, chain: supabaseMock.fromFn.mock.results[i].value }))
      .filter(({ call }) => call[0] === 'transactions');
    const txnUpdateCall = txnCalls.find(({ chain }) => chain.update.mock.calls.length > 0);
    expect(txnUpdateCall?.chain.update).toHaveBeenCalledWith({ status: txnStatus });

    const notificationsChain = supabaseMock.fromFn.mock.results.find(
      (_, i) => supabaseMock.fromFn.mock.calls[i][0] === 'notifications'
    )?.value;
    expect(notificationsChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: TXN.customer_id }),
      expect.objectContaining({ user_id: TXN.tradie_id }),
    ]);
  });

  it.each([
    ['marked_completed', 'accept'],
    ['marked_cancelled', 'cancel'],
  ])('action=%s calls tradesafe-allocation-action with action=%s', async (action, tsAction) => {
    setupSupabase({
      profiles: { data: { push_token: null }, error: null },
      dispute_notes: { data: NOTE_ROW, error: null },
      transactions: { data: TXN, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    await POST(makeRequest({ jobId: 'job-1', note: 'resolved', action }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/tradesafe-allocation-action'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-1', action: tsAction, comment: 'resolved' }),
      })
    );
  });

  it('does not call TradeSafe for a reverted_to_in_progress resolution', async () => {
    setupSupabase({
      profiles: { data: { push_token: null }, error: null },
      dispute_notes: { data: NOTE_ROW, error: null },
      transactions: { data: TXN, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    await POST(makeRequest({ jobId: 'job-1', note: 'resolved', action: 'reverted_to_in_progress' }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still updates the ledger when the TradeSafe call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    setupSupabase({
      profiles: { data: { push_token: null }, error: null },
      dispute_notes: { data: NOTE_ROW, error: null },
      transactions: { data: TXN, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    const res = await POST(makeRequest({ jobId: 'job-1', note: 'resolved', action: 'marked_completed' }));

    expect(res.status).toBe(200);
    const txnCalls = supabaseMock.fromFn.mock.calls
      .map((call, i) => ({ call, chain: supabaseMock.fromFn.mock.results[i].value }))
      .filter(({ call }) => call[0] === 'transactions');
    const txnUpdateCall = txnCalls.find(({ chain }) => chain.update.mock.calls.length > 0);
    expect(txnUpdateCall?.chain.update).toHaveBeenCalledWith({ status: 'released' });
  });

  it('leaves jobs and transactions untouched for a note-only resolution', async () => {
    setupSupabase({
      dispute_notes: { data: NOTE_ROW, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    await POST(makeRequest({ jobId: 'job-1', note: 'just a note' }));

    expect(supabaseMock.fromFn.mock.calls.some((c) => c[0] === 'jobs')).toBe(false);
    expect(supabaseMock.fromFn.mock.calls.some((c) => c[0] === 'transactions')).toBe(false);
  });

  it('attributes the note and the audit log entry to the real signed-in admin', async () => {
    setupSupabase({
      dispute_notes: { data: NOTE_ROW, error: null },
      transactions: { data: TXN, error: null },
      profiles: { data: { push_token: null }, error: null },
    });
    const { POST } = await import('@/app/api/disputes/resolve/route');
    await POST(makeRequest({ jobId: 'job-1', note: 'resolved', action: 'marked_completed' }));

    const notesChain = supabaseMock.fromFn.mock.results.find(
      (_, i) => supabaseMock.fromFn.mock.calls[i][0] === 'dispute_notes'
    )?.value;
    expect(notesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ admin_id: REAL_ADMIN.id })
    );

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: REAL_ADMIN.id,
        action: 'dispute.resolve',
        targetTable: 'jobs',
        targetId: 'job-1',
      })
    );
  });
});
