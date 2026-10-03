const mockInsert = jest.fn();
const mockFrom = jest.fn((_table: string) => ({ insert: mockInsert }));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

import { logAdminAction } from '@/lib/audit';

describe('logAdminAction (admin/src/lib/audit.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('writes a row with admin_id, action, target_table, target_id', async () => {
    await logAdminAction({
      adminId: 'admin-1',
      action: 'user.delete',
      targetTable: 'profiles',
      targetId: 'user-42',
    });

    expect(mockFrom).toHaveBeenCalledWith('audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      action: 'user.delete',
      target_table: 'profiles',
      target_id: 'user-42',
      details: null,
    });
  });

  it('includes details when given', async () => {
    await logAdminAction({
      adminId: 'admin-1',
      action: 'settings.update',
      targetTable: 'platform_settings',
      targetId: 'true',
      details: { commissionPct: 0.07 },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ details: { commissionPct: 0.07 } })
    );
  });

  it('never throws if the insert itself fails — audit logging must not break the action it documents', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'connection reset' } });
    await expect(
      logAdminAction({ adminId: 'admin-1', action: 'user.delete', targetTable: 'profiles', targetId: 'user-42' })
    ).resolves.toBeUndefined();
  });
});
