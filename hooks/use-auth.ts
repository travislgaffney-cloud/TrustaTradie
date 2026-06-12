import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';
import type { Profile, TradieProfile } from '@/types/database';

export function useAuth() {
  const { setSession, setProfile, setTradieProfile, setLoading, reset } = useAuthStore();

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
          reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    setLoading(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<Profile>();

    setProfile(profile ?? null);

    if (profile?.role === 'tradie') {
      const { data: tp } = await supabase
        .from('tradie_profiles')
        .select('*')
        .eq('id', userId)
        .single<TradieProfile>();
      setTradieProfile(tp ?? null);
    }

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
  }

  return { signOut };
}
