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
jest.mock('@/lib/supabase-server', () => ({
  getCurrentAdmin: () => mockGetCurrentAdmin(),
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

// This route is where an admin's dispute decision actually moves money in
// the internal ledger — it maps a 3-way admin action to both jobs.status and
// transactions.status, and (per its own TODO) only updates our ledger, not
// TradeSafe's real funds. These tests pin the three action -> status
// mappings and guard against regressing the "no session" / "no note"
// failure paths.
describe('POST /api/disputes/resolve', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(REAL_ADMIN);
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
