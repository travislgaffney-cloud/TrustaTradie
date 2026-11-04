import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AuthLayout() {
  const { session, isLoading, profile } = useAuthStore();

  if (isLoading) return <LoadingSpinner full />;

  if (session && profile?.onboarding_complete) {
    if (profile.role === 'tradie') return <Redirect href="/(tradie)/home" />;
    return <Redirect href="/(customer)/home" />;
  }

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
  if (session && profile && !profile.onboarding_complete && session.user.app_metadata?.provider === 'email') {
    return <Redirect href="/(auth)/sign-up-location" />;
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
