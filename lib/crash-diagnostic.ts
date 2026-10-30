// TEMPORARY — installed to catch the exact JS error behind a TestFlight
// launch crash that neither Sentry (confirmed, by fully disabling it and
// still crashing) nor the symbolicated native crash log (no human-readable
// message) could identify. React Native's own fatal-error handling reports
// an uncaught JS error through RCTExceptionsManager and aborts the process
// in a release build, instead of showing the red-screen a dev build would —
// so the only way to see the real message is to intercept it ourselves,
// before that abort happens, and get it off the device immediately via a
// direct network write (not through the app's normal Supabase client, to
// keep this path as small and dependency-free as possible).
//
// Chains to whatever handler was already installed (Sentry's, if active,
// or React Native's default) so this only adds visibility — it doesn't
// change what happens after.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function reportRawCrash(error: unknown, isFatal?: boolean) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    fetch(`${SUPABASE_URL}/rest/v1/bug_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        error_message: `[crash-diagnostic] ${isFatal ? 'FATAL' : 'non-fatal'}: ${message}`,
        stack_trace: stack ?? null,
        screen: 'global-error-handler',
        app_version: '1.0.0',
      }),
    }).catch(() => {});
  } catch {
    // Never let the diagnostic reporting itself be the thing that throws.
  }
}

try {
  const ErrorUtilsGlobal = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void; setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;
  if (ErrorUtilsGlobal) {
    const previousHandler = ErrorUtilsGlobal.getGlobalHandler();
    ErrorUtilsGlobal.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      reportRawCrash(error, isFatal);
      previousHandler(error, isFatal);
    });
  }
} catch {
  // Same reasoning as above.
}
