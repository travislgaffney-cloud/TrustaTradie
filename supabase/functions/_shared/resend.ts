// Shared Resend API client for edge functions, mirroring _shared/tradesafe.ts's
// shape (one focused request function, error surfaced as a clean message).
const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const from = params.from ?? Deno.env.get('DIGEST_FROM_ADDRESS') ?? 'TrustaTradie <onboarding@resend.dev>';

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${text}`);
  }
}
