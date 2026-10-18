// Shared TradeSafe API client for edge functions. All values below (endpoint
// shapes, enum names, fee semantics) were verified against the real sandbox
// GraphQL schema and a live test transaction — not guessed from docs, which
// in a few places (bank enum requirement, fee being a 0-100 number not a
// 0-1 fraction) turned out to disagree with what's written up publicly.

const AUTH_URL = 'https://auth.tradesafe.co.za/oauth/token';
const GRAPHQL_URL = Deno.env.get('TRADESAFE_API_URL') ?? 'https://pay-sandbox.tradesafe.dev/graphql';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('TRADESAFE_CLIENT_ID')!,
      client_secret: Deno.env.get('TRADESAFE_CLIENT_SECRET')!,
    }),
  });

  if (!res.ok) throw new Error(`TradeSafe auth failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

export async function tradesafeRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    // TradeSafe's error `message` is often a clean, user-presentable string
    // ("You cannot complete delivery for this allocation"); everything else
    // in the error object is a PHP stack trace not worth surfacing.
    const messages = json.errors.map((e: { message: string }) => e.message).join('; ');
    console.error('TradeSafe GraphQL error (full):', JSON.stringify(json.errors));
    throw new Error(messages);
  }
  return json.data;
}

// Exact 1:1 map from constants/trade-categories.ts SA_BANKS values to
// TradeSafe's UniversalBranchCode enum — confirmed by listing every value
// that enum actually accepts (only 18 exist; a free-text bank name is
// rejected outright, this enum is mandatory for a valid bank account token).
const BANK_MAP: Record<string, string> = {
  absa: 'ABSA',
  capitec: 'CAPITEC',
  fnb: 'FNB',
  nedbank: 'NEDBANK',
  standard_bank: 'SBSA',
  investec: 'INVESTEC',
  african_bank: 'AFRICAN',
  tymebank: 'TYME',
  discovery: 'DISCOVERY',
};

export function mapBank(saBankValue: string | null | undefined): string {
  if (!saBankValue) return 'OTHER';
  return BANK_MAP[saBankValue] ?? 'OTHER';
}

// Exact 1:1 map from constants/trade-categories.ts ACCOUNT_TYPES values to
// TradeSafe's BankAccountType enum.
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  cheque: 'CHEQUE',
  savings: 'SAVINGS',
  transmission: 'TRANSMISSION',
};

export function mapAccountType(saAccountType: string | null | undefined): string {
  if (!saAccountType) return 'SAVINGS';
  return ACCOUNT_TYPE_MAP[saAccountType] ?? 'SAVINGS';
}
