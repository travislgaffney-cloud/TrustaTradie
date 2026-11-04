import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { Sentry } from '@/lib/sentry';
import { useAuthStore } from '@/store/auth-store';
import type { Profile, TradieProfile } from '@/types/database';

export function useAuth() {
  const { setSession, setProfile, setTradieProfile, setLoading, reset } = useAuthStore();
  // supabase-js fires onAuthStateChange with the restored session (as
  // INITIAL_SESSION) independently of the explicit getSession() call below —
  // both end up calling loadProfile() for the same user concurrently on
  // boot, which was making `isLoading` flap between true/false mid-load.
  // Guards against doing the redundant second load.
  const loadingUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
          const token = await registerForPushNotifications();
          if (token) await savePushToken(session.user.id, token);
        } else {
          Sentry.setUser(null);
          reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    if (loadingUserId.current === userId) return;
    loadingUserId.current = userId;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single<Profile>();

      setProfile(profile ?? null);
      // Ties crash reports to a role/id, not personal data — nothing beyond
      // what's needed to tell "which account hit this" from the dashboard.
      Sentry.setUser(profile ? { id: profile.id, role: profile.role } : null);

      if (profile?.role === 'tradie') {
        const { data: tp } = await supabase
          .from('tradie_profiles')
          .select('*')
          .eq('id', userId)
          .single<TradieProfile>();
        setTradieProfile(tp ?? null);
      }
    } finally {
      setLoading(false);
      loadingUserId.current = null;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
  }

  return { signOut };
}
