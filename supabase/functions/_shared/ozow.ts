// Shared Ozow API client for edge functions. Ozow is a South African
// instant-EFT payment gateway, used here for the one-time tradie
// verification fee. Built against Ozow's current "One API" (OAuth2 client
// credentials + JSON REST), NOT the older deprecated SiteCode/HashCheck
// hosted-checkout integration. Docs: https://hub.ozow.com/
//
// Env vars: OZOW_CLIENT_ID, OZOW_CLIENT_SECRET, OZOW_SITE_CODE,
// OZOW_WEBHOOK_SECRET (the whsec_... secret for the registered webhook —
// added once the webhook endpoint exists and is registered in the Ozow
// Portal), and OZOW_USE_STAGING="true" to point at the staging environment.

const USE_STAGING = Deno.env.get('OZOW_USE_STAGING') === 'true';
const API_BASE = USE_STAGING ? 'https://stagingone.ozow.com/v1' : 'https://one.ozow.com/v1';
const SITE_CODE = Deno.env.get('OZOW_SITE_CODE')!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('OZOW_CLIENT_ID')!,
      client_secret: Deno.env.get('OZOW_CLIENT_SECRET')!,
      scope: 'payments',
    }),
  });

  if (!res.ok) throw new Error(`Ozow auth failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in) * 1000 };
  return cachedToken.token;
}

export interface OzowPayment {
  id: string;
  status: string;
  redirectUrl?: string;
}

// merchantReference: our own id, up to 50 chars, any characters.
// beneficiaryReference: letters/numbers ONLY, max 20 chars — Ozow rejects
// anything else with a 400. A UUID's hyphens don't fit this, so we derive a
// short alphanumeric token from it; it's just a display reference, not a
// lookup key (the real correlation uses the returned payment `id`).
function toBeneficiaryReference(verificationId: string): string {
  return verificationId.replace(/-/g, '').slice(0, 20);
}

export async function createOzowPayment(params: {
  verificationId: string;
  amount: number;
  returnUrl: string;
  notifyUrl: string;
}): Promise<OzowPayment> {
  const token = await getAccessToken();

  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'Idempotency-Key': params.verificationId,
    },
    body: JSON.stringify({
      siteCode: SITE_CODE,
      region: 'ZA',
      amount: { currency: 'ZAR', value: params.amount },
      merchantReference: params.verificationId,
      beneficiaryReference: toBeneficiaryReference(params.verificationId),
      expireAt,
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('Ozow create payment error:', res.status, JSON.stringify(json));
    throw new Error(json.detail ?? json.title ?? `Ozow payment creation failed: ${res.status}`);
  }

  return { id: json.id, status: json.status, redirectUrl: json.redirectUrl };
}

export async function getOzowPaymentStatus(paymentId: string): Promise<{ id: string; status: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('Ozow get payment status error:', res.status, JSON.stringify(json));
    throw new Error(`Ozow payment status lookup failed: ${res.status}`);
  }
  return { id: json.id, status: json.status };
}

// Svix webhook signature verification (Ozow's current webhook system uses
// the Svix standard, not the old Payments API's Hash field). Verifies
// against the RAW request body bytes — never a re-serialized/parsed copy,
// since that can change key order or whitespace and break the signature.
export async function verifyOzowWebhookSignature(params: {
  rawBody: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}): Promise<boolean> {
  const secret = Deno.env.get('OZOW_WEBHOOK_SECRET');
  if (!secret) {
    console.error('OZOW_WEBHOOK_SECRET not configured — rejecting webhook');
    return false;
  }

  const timestampSeconds = Number(params.svixTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 300) {
    console.error('Ozow webhook timestamp too old/far in the future:', ageSeconds);
    return false;
  }

  const keyBytes = base64Decode(secret.replace(/^whsec_/, ''));
  const signedContent = `${params.svixId}.${params.svixTimestamp}.${params.rawBody}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signedContent));
  const expected = base64Encode(new Uint8Array(signatureBytes));

  const candidates = params.svixSignature.split(' ');
  for (const candidate of candidates) {
    const [version, value] = candidate.split(',');
    if (version !== 'v1' || !value) continue;
    if (timingSafeEqual(value, expected)) return true;
  }
  return false;
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
