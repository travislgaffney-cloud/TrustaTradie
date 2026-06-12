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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-up-customer" />
      <Stack.Screen name="sign-up-tradie" />
      <Stack.Screen name="sign-up-location" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
