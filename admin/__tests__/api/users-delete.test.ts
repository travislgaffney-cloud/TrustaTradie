import { createSupabaseTableMock } from '../helpers/supabase-mock';

let tableMock: ReturnType<typeof createSupabaseTableMock>;
let storageListMock: jest.Mock;
let storageRemoveMock: jest.Mock;
let updateUserByIdMock: jest.Mock;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return {
      from: tableMock.fromFn,
      storage: {
        from: (bucket: string) => ({
          list: (...args: any[]) => storageListMock(bucket, ...args),
          remove: (...args: any[]) => storageRemoveMock(bucket, ...args),
        }),
      },
      auth: {
        admin: { updateUserById: (...args: any[]) => updateUserByIdMock(...args) },
      },
    };
  },
}));

// getCurrentAdmin() calls next/headers' cookies(), which only works inside
// a real Next.js request context — not available when a test calls a route
// handler directly. Mocking it here is the standard way to test these
// routes; audit-logging behavior itself is covered separately.
jest.mock('@/lib/supabase-server', () => ({
  getCurrentAdmin: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/audit', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
}));

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/users/delete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// This route is the one place that can anonymize a user's PII and
// permanently lock their login. The previous version silently failed to
// delete anything (blocked by NO ACTION foreign keys with no error
// surfaced) — these tests pin that it actually anonymizes the profile,
// strips tradie business fields, and bans the auth identity, and that any
// failure along the way is surfaced rather than swallowed.
describe('POST /api/users/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tableMock = createSupabaseTableMock({
      tradie_documents: { data: null, error: null },
      portfolio_images: { data: null, error: null },
      profiles: { data: null, error: null },
      tradie_profiles: { data: null, error: null },
    });
    storageListMock = jest.fn().mockResolvedValue({ data: [] });
    storageRemoveMock = jest.fn().mockResolvedValue({ data: null, error: null });
    updateUserByIdMock = jest.fn().mockResolvedValue({ data: {}, error: null });
  });

  it('rejects a request with no id', async () => {
    const { POST } = await import('@/app/api/users/delete/route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('anonymizes the profile instead of deleting the row', async () => {
    const { POST } = await import('@/app/api/users/delete/route');
    await POST(makeRequest({ id: 'user-1' }));

    const profilesChain = tableMock.fromFn.mock.results.find(
      (_, i) => tableMock.fromFn.mock.calls[i][0] === 'profiles'
    )?.value;
    expect(profilesChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Deleted User',
        avatar_url: null,
        phone: null,
        is_suspended: true,
      })
    );
  });

  it('strips tradie-specific business fields', async () => {
    const { POST } = await import('@/app/api/users/delete/route');
    await POST(makeRequest({ id: 'user-1' }));

    const tradieProfilesChain = tableMock.fromFn.mock.results.find(
      (_, i) => tableMock.fromFn.mock.calls[i][0] === 'tradie_profiles'
    )?.value;
    expect(tradieProfilesChain.update).toHaveBeenCalledWith({
      cipc_number: null,
      vat_number: null,
      hourly_rate: null,
    });
  });

  it('permanently bans the auth identity with a scrubbed email', async () => {
    const { POST } = await import('@/app/api/users/delete/route');
    await POST(makeRequest({ id: 'user-1' }));

    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', expect.objectContaining({
      email: 'deleted-user-1@trustatradie.invalid',
      ban_duration: expect.any(String),
    }));
  });

  it('removes PII-bearing storage files from every foldered bucket plus avatars', async () => {
    storageListMock.mockImplementation((bucket: string) =>
      Promise.resolve({ data: bucket === 'avatars' ? [{ name: 'user-1.jpg' }] : [{ name: 'file.pdf' }] })
    );
    const { POST } = await import('@/app/api/users/delete/route');
    await POST(makeRequest({ id: 'user-1' }));

    expect(storageRemoveMock).toHaveBeenCalledWith('documents', ['user-1/file.pdf']);
    expect(storageRemoveMock).toHaveBeenCalledWith('portfolio', ['user-1/file.pdf']);
    expect(storageRemoveMock).toHaveBeenCalledWith('completion-photos', ['user-1/file.pdf']);
    expect(storageRemoveMock).toHaveBeenCalledWith('avatars', ['user-1.jpg']);
  });

  it('surfaces the error instead of silently failing when the profile update fails', async () => {
    tableMock = createSupabaseTableMock({
      tradie_documents: { data: null, error: null },
      portfolio_images: { data: null, error: null },
      profiles: { data: null, error: { message: 'row-level security violation' } },
    });
    const { POST } = await import('@/app/api/users/delete/route');
    const res = await POST(makeRequest({ id: 'user-1' }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/row-level security/i);
    // The historical bug: must not report success when a step actually failed.
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it('surfaces an auth ban failure rather than reporting success', async () => {
    updateUserByIdMock.mockResolvedValue({ data: null, error: { message: 'user not found' } });
    const { POST } = await import('@/app/api/users/delete/route');
    const res = await POST(makeRequest({ id: 'user-1' }));

    expect(res.status).toBe(500);
  });
});
