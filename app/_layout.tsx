import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoading, session, profile } = useAuthStore();

  // Initialise auth listener
  useAuth();

  if (isLoading) return <LoadingSpinner full />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!session || !profile?.onboarding_complete ? (
          <Stack.Screen name="(auth)" />
        ) : profile.role === 'tradie' ? (
          <Stack.Screen name="(tradie)" />
        ) : (
          <Stack.Screen name="(customer)" />
        )}
        <Stack.Screen name="tradie/[tradieId]" options={{ headerShown: true, title: 'Tradie Profile' }} />
        <Stack.Screen name="rate/[jobId]" options={{ headerShown: true, title: 'Rate This Job', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
