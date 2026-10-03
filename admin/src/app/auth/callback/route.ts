import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Where the magic-link email sends the admin back to. Exchanges the PKCE
// code for a real session.
//
// Deliberately NOT using createSupabaseServerClient() (next/headers'
// cookies()) here — cookies set that way didn't reliably end up on the
// redirect response in testing (session was valid within this request, but
// gone by the time middleware read the next request). Attaching cookies
// directly to the exact response object being returned removes that
// ambiguity entirely.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    console.error('[auth/callback] no code param on the request — check Supabase Auth email template / redirect URL allowlist');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get('cookie') ?? '';
          return cookieHeader
            .split(';')
            .map((c) => {
              const idx = c.indexOf('=');
              if (idx === -1) return null;
              return { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() };
            })
            .filter((c): c is { name: string; value: string } => c !== null && c.name.length > 0);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return response;
}
