import { supabase } from '@/lib/supabase';

// Called at the end of every mutating admin route, after the action has
// actually succeeded. Uses the service-role client (same as the rest of
// these routes) since the admin_id is supplied explicitly rather than
// relied on from the session — see getCurrentAdmin() in supabase-server.ts
// for how that identity was established in the first place.
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    admin_id: params.adminId,
    action: params.action,
    target_table: params.targetTable,
    target_id: params.targetId,
    details: params.details ?? null,
  });
  if (error) {
    // Never let audit logging itself break the admin action it's
    // documenting — log loudly server-side and move on.
    console.error('[audit_log] failed to record action:', params.action, error.message);
  }
}
