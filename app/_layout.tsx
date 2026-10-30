import type { ComponentType } from 'react';
// TEMPORARY, imported first on purpose — see lib/crash-diagnostic.ts for why.
import '@/lib/crash-diagnostic';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationRouter } from '@/hooks/use-notification-router';
import { useAuthStore } from '@/store/auth-store';
import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { ErrorBoundary } from '@/components/error-boundary';
// Module-scope import so Sentry.init() runs as early as possible in the
// app's lifecycle, before any screen renders.
import { Sentry, sentryActive } from '@/lib/sentry';

function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoading, session, profile } = useAuthStore();

  // Initialise auth listener
  useAuth();
  useNotificationRouter();

  if (isLoading) return <AppLoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              {!session || !profile?.onboarding_complete ? (
                <Stack.Screen name="(auth)" />
              ) : profile.role === 'tradie' ? (
                <Stack.Screen name="(tradie)" />
              ) : (
                <Stack.Screen name="(customer)" />
              )}
              <Stack.Screen name="tradie/[tradieId]" options={{ headerShown: false }} />
              <Stack.Screen name="rate/[jobId]" options={{ headerShown: true, title: 'Rate This Job', presentation: 'modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Guarded for the same reason as Sentry.init() in lib/sentry.ts — this
// also runs at module-eval time, before anything renders, so a problem in
// Sentry's own wrap() must not be able to take the whole app down with it.
let ExportedRootLayout: ComponentType<Record<string, unknown>> = RootLayout;
if (sentryActive) {
  try {
    ExportedRootLayout = Sentry.wrap(RootLayout);
  } catch (err) {
    console.warn('[sentry] wrap failed, rendering without it:', err);
  }
}

export default ExportedRootLayout;
