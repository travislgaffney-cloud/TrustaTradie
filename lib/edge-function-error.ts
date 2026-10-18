// supabase.functions.invoke() resolves { data: null, error } for ANY non-2xx
// response — our edge functions' own JSON body (e.g. { error: "..." }) never
// reaches `data` in that case, only `error.context` (the raw Response).
// Every call site that checked `data?.error ?? error?.message` was therefore
// always hitting the SDK's generic "Edge Function returned a non-2xx status
// code" instead of the real reason, hiding exactly the detail a user needs
// (e.g. "Payment has not been initiated via TradeSafe yet").
export async function extractFunctionErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context as
    | { json?: () => Promise<unknown> }
    | undefined;

  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string } | null;
      if (body?.error) return body.error;
    } catch {
      // Body wasn't JSON (network/relay error) — fall through to error.message.
    }
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
