// Mirrors supabase/functions/_shared/resend.ts — same provider, but this
// route runs in the admin Next.js app's own environment, not an edge
// function, so it needs its own copy rather than importing across runtimes.
const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(params: { to: string[]; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const from = process.env.DIGEST_FROM_ADDRESS ?? "TrustaTradie <onboarding@resend.dev>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${text}`);
  }
}
