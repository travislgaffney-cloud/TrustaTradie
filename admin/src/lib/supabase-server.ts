import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// For use in Server Components, Route Handlers, and Server Actions — reads
// the real per-admin Supabase Auth session from cookies (set by middleware
// or the auth callback route), as opposed to admin/src/lib/supabase.ts
// which is the service-role client used for the actual data operations.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies can't be
            // written — harmless as long as middleware is also refreshing
            // the session, which it is.
          }
        },
      },
    }
  );
}

// Resolves the caller to a real admin identity (not just "is there a valid
// session" — also checks membership in `admins`), for route handlers that
// need to know WHO is acting, e.g. to write an audit_log row.
export async function getCurrentAdmin(): Promise<{ id: string; email: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!adminRow) return null;

  return { id: user.id, email: user.email ?? '' };
}

// For routes that need to call an edge function AS this admin (e.g.
// tradesafe-allocation-action's admin-only 'cancel'/'accept' actions) rather
// than as the service-role key — ties the privileged call to a real,
// audited admin identity instead of a shared secret.
export async function getCurrentAdminAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
