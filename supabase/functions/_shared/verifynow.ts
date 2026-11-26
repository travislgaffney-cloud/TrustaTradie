// Shared VerifyNow API client for edge functions. VerifyNow is a South
// African identity/business verification service used for the paid tradie
// "Verified" tier: an SA ID check, a CIPC company match, and a bank account
// verification. Docs: https://www.verifynow.co.za/api-docs
//
// Auth is a single `x-api-key` header (same key for sandbox and production —
// switched per-request via a `mode` field in the body, not a different key).

const BASE_URL = 'https://www.verifynow.co.za/api/external';
const API_KEY = Deno.env.get('VERIFYNOW_API_KEY')!;
// Default to sandbox so a misconfigured deploy can't silently spend real
// credits / run real Home Affairs lookups. Flip explicitly once ready.
const MODE = Deno.env.get('VERIFYNOW_MODE') ?? 'sandbox';

async function verifyNowRequest<T = any>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ ...body, mode: MODE }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error(`VerifyNow ${path} error (${res.status}):`, JSON.stringify(json));
    throw new Error(json.message ?? `VerifyNow request failed: ${res.status}`);
  }
  return json;
}

export interface IdCheckResult {
  passed: boolean;
  raw: unknown;
}

export async function verifyIdNumber(idNumber: string, idempotencyKey: string): Promise<IdCheckResult> {
  const raw = await verifyNowRequest('/verify', {
    reportType: 'home_affairs_real_time_idv',
    idNumber,
  }, idempotencyKey);

  // Defensive: VerifyNow's documented happy-path field for this report type
  // is results.said_verification.realTimeResults.Status (e.g. "ID Number
  // Valid") or a top-level Status under the same shape for the real-time
  // IDV report. We treat anything other than an explicit success string as
  // a failure rather than assuming an unfamiliar shape means "passed".
  const status: string | undefined =
    raw?.results?.home_affairs_real_time_idv?.Status ??
    raw?.results?.said_verification?.realTimeResults?.Status ??
    raw?.results?.realTimeResults?.Status;

  const passed = typeof status === 'string' && /valid|success/i.test(status);
  return { passed, raw };
}

export interface CipcCheckResult {
  passed: boolean;
  raw: unknown;
}

export async function verifyCipcNumber(registrationNumber: string, idempotencyKey: string): Promise<CipcCheckResult> {
  const raw = await verifyNowRequest('/cipc', {
    reportType: 'cipc_company_match',
    registration_number: registrationNumber,
  }, idempotencyKey);

  const status: string | undefined =
    raw?.results?.cipc_company_match?.status ?? raw?.results?.status;

  const passed = typeof status === 'string' && /active|in business/i.test(status);
  return { passed, raw };
}

// 1:1 map from constants/trade-categories.ts SA_BANKS values to VerifyNow's
// bankName strings. Branch codes already match VerifyNow's own bank codes
// (confirmed against their /banks reference for FNB/Capitec/Standard
// Bank/ABSA), so bank_branch_code is passed straight through as
// bankBranchCode with no separate lookup needed.
const BANK_NAME_MAP: Record<string, string> = {
  absa: 'ABSA',
  capitec: 'Capitec',
  fnb: 'FNB',
  nedbank: 'Nedbank',
  standard_bank: 'Standard Bank',
  investec: 'Investec',
  african_bank: 'African Bank',
  tymebank: 'TymeBank',
  discovery: 'Discovery Bank',
};

function mapBankName(saBankValue: string | null | undefined): string {
  if (!saBankValue) return 'Unknown';
  return BANK_NAME_MAP[saBankValue] ?? 'Unknown';
}

// 1:1 map from constants/trade-categories.ts ACCOUNT_TYPES values to
// VerifyNow's bankAccountType enum (Unknown/Savings/Current/Transmission/
// Bond/SubscriptionShare) — note VerifyNow uses "Current", not "Cheque".
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  cheque: 'Current',
  savings: 'Savings',
  transmission: 'Transmission',
};

function mapAccountType(saAccountType: string | null | undefined): string {
  if (!saAccountType) return 'Unknown';
  return ACCOUNT_TYPE_MAP[saAccountType] ?? 'Unknown';
}

export interface BankCheckResult {
  passed: boolean;
  raw: unknown;
}

export async function verifyBankAccount(params: {
  firstName: string;
  surname: string;
  idNumber: string;
  bankValue: string | null;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankAccountType: string | null;
}, idempotencyKey: string): Promise<BankCheckResult> {
  const raw = await verifyNowRequest('/bank-account-verification', {
    firstName: params.firstName,
    surname: params.surname,
    identityNumber: params.idNumber,
    identityType: 'IDNumber',
    type: 'Individual',
    bankName: mapBankName(params.bankValue),
    bankAccountNumber: params.bankAccountNumber,
    bankBranchCode: params.bankBranchCode,
    bankAccountType: mapAccountType(params.bankAccountType),
  }, idempotencyKey);

  const passed = raw?.results?.identity_and_account_verified === true;
  return { passed, raw };
}
