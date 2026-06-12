import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import type { Profile, TradieProfile, UserRole } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tradieProfile: TradieProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setTradieProfile: (tp: TradieProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  tradieProfile: null,
  role: null,
  isLoading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) =>
    set({ profile, role: profile?.role ?? null }),

  setTradieProfile: (tradieProfile) => set({ tradieProfile }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      tradieProfile: null,
      role: null,
      isLoading: false,
    }),
}));
