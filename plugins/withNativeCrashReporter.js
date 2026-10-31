const { withAppDelegate } = require('@expo/config-plugins');

// TEMPORARY diagnostic plugin: injects an NSSetUncaughtExceptionHandler into
// the generated AppDelegate that POSTs the real exception name/reason/stack
// to Supabase before the process terminates. Needed because every other
// avenue (our JS ErrorUtils handler, Sentry, Apple's own TestFlight
// diagnostics API) has failed to surface what's actually crashing - see the
// investigation notes in lib/crash-diagnostic.ts. Unlike a signal handler,
// NSSetUncaughtExceptionHandler still runs in a normal enough context to
// make one short, blocking network call before the app dies.
function injectCrashHandler(contents, supabaseUrl, supabaseKey) {
  if (contents.includes('NSSetUncaughtExceptionHandler')) {
    return contents;
  }

  const marker = 'didFinishLaunchingWithOptions';
  const markerIdx = contents.indexOf(marker);
  if (markerIdx === -1) {
    return contents;
  }
  const braceIdx = contents.indexOf('{', markerIdx);
  if (braceIdx === -1) {
    return contents;
  }

  const snippet = `
    NSSetUncaughtExceptionHandler { exception in
      let crashName = exception.name.rawValue
      let crashReason = exception.reason ?? "no reason"
      let crashStack = exception.callStackSymbols.joined(separator: "\\n")
      let crashMessage = "[native-crash-diagnostic] FATAL: " + crashName + ": " + crashReason
      if let url = URL(string: "${supabaseUrl}/rest/v1/bug_reports") {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("${supabaseKey}", forHTTPHeaderField: "apikey")
        request.setValue("Bearer ${supabaseKey}", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
          "error_message": crashMessage,
          "stack_trace": crashStack,
          "screen": "native-uncaught-exception-handler",
          "app_version": "1.0.0",
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let semaphore = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: request) { _, _, _ in
          semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 3)
      }
    }
`;

  return contents.slice(0, braceIdx + 1) + snippet + contents.slice(braceIdx + 1);
}

module.exports = function withNativeCrashReporter(config) {
  return withAppDelegate(config, (config) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[withNativeCrashReporter] missing Supabase env vars, skipping injection');
      return config;
    }
    if (config.modResults.language !== 'swift') {
      console.warn('[withNativeCrashReporter] AppDelegate is not Swift, skipping injection');
      return config;
    }
    config.modResults.contents = injectCrashHandler(config.modResults.contents, supabaseUrl, supabaseKey);
    return config;
  });
};
