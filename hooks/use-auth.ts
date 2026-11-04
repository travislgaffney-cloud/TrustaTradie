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
          // Push registration can throw natively — e.g. Android crashes
          // outright with "Default FirebaseApp is not initialized" when FCM
          // credentials aren't configured (docs.expo.dev/push-notifications/
          // fcm-credentials). That's a missing-setup problem, not a reason to
          // crash the whole sign-in flow a user is in the middle of.
          try {
            const token = await registerForPushNotifications();
            if (token) await savePushToken(session.user.id, token);
          } catch (err) {
            console.warn('[useAuth] push notification registration failed, continuing without it:', err);
            Sentry.captureException(err);
          }
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
    // isLoading gates the entire app down to a spinner (RootLayout,
    // AuthLayout, app/index.tsx all unmount their content while it's true).
    // That's correct for the very first load, but loadProfile() also runs on
    // every later auth event (e.g. a routine TOKEN_REFRESHED while the user
    // is mid-interaction on some screen) — toggling isLoading for those too
    // was yanking the whole app back to a spinner mid-session, which is what
    // was causing screens to reset/crash out during normal use. Only the
    // genuine first load (no profile yet) should touch isLoading.
    const isInitialLoad = useAuthStore.getState().profile === null;
    if (isInitialLoad) setLoading(true);
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
      if (isInitialLoad) setLoading(false);
      loadingUserId.current = null;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
  }

  return { signOut };
}
