import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Index() {
  const { isLoading, session, profile } = useAuthStore();

  if (isLoading) return <LoadingSpinner full />;

  if (!session || !profile?.onboarding_complete) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (profile.role === 'tradie') return <Redirect href="/(tradie)/home" />;
  return <Redirect href="/(customer)/home" />;
}
