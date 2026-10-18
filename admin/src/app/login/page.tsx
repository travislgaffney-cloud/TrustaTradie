"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

// useSearchParams() opts the page out of static prerendering unless the
// component that calls it sits inside a Suspense boundary — without this
// split, `next build` fails outright on this page (confirmed: this was
// breaking production builds before today, undetected because CI only runs
// tsc, never an actual `next build`).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(err === "no_code" ? "The sign-in link didn't include a valid code." : err);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B2D4F]">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-lg font-extrabold tracking-tight text-[#1B2D4F]">TrustaTradie</h1>
          <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
        </div>

        {sent ? (
          <p className="text-sm text-gray-700 text-center">
            Check <span className="font-semibold">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@trustatradie.com"
              autoFocus
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="bg-[#1B2D4F] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#243b66] transition disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
