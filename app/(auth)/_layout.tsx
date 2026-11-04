import { router, Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AuthLayout() {
  const { session, isLoading, profile } = useAuthStore();

  // A session can persist across app restarts (AsyncStorage) for an account
  // that signed up but never finished onboarding — e.g. closed the app
  // before picking service towns. Without this, that case silently dumps
  // the user on the welcome screen with no indication why, looking exactly
  // like a broken login. sign-in.tsx and GoogleSignInButton already resume
  // onboarding after an explicit sign-in action; this covers the automatic
  // session-restore-on-boot path that neither of those runs for.
  // Google OAuth accounts still need google-setup first (role/categories
  // aren't collected yet at this point), so they're left to their own
  // explicit resume logic rather than being sent to sign-up-location here.
  // Done imperatively (not via <Redirect>) because the target screen lives
  // inside the Stack below — a <Redirect> returned in place of that Stack
  // would have no mounted navigator to redirect within.
  useEffect(() => {
    // Also wait for !isLoading: loadProfile() sets `profile` before it sets
    // `isLoading` back to false (there's an extra tradie_profiles fetch in
    // between for tradie accounts), so without this the effect could fire
    // while the Stack below is still unmounted for the loading spinner —
    // router.replace has nothing mounted to navigate within at that instant.
    if (!isLoading && session && profile && !profile.onboarding_complete && session.user.app_metadata?.provider === 'email') {
      router.replace('/(auth)/sign-up-location');
    }
  }, [isLoading, session, profile]);

  if (isLoading) return <LoadingSpinner full />;

  if (session && profile?.onboarding_complete) {
    if (profile.role === 'tradie') return <Redirect href="/(tradie)/home" />;
    return <Redirect href="/(customer)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-up-customer" />
      <Stack.Screen name="sign-up-tradie" />
      <Stack.Screen name="sign-up-location" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="confirm-email" />
      <Stack.Screen name="google-setup" />
    </Stack>
  );
}
