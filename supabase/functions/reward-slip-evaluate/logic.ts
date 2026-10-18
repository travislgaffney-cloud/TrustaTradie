// Pure, DB-free auto-approval decision logic — extracted so it can be unit
// tested directly, same reasoning as tradesafe-webhook/logic.ts and
// tradesafe-allocation-action/logic.ts in this repo.

export type FlagReason =
  | 'duplicate'
  | 'date_out_of_range'
  | 'ocr_mismatch'
  | 'supplier_mismatch'
  | 'ocr_failed'
  | 'over_threshold';

export interface SlipForEvaluation {
  totalAmount: number;
  slipDate: string; // ISO date, e.g. '2026-10-18'
  ocrSupplierName: string | null;
  ocrTotal: number | null;
  ocrDate: string | null;
  ocrConfidence: number | null;
}

export interface SupplierForEvaluation {
  name: string;
  rewardPct: number;
  minSlipAmount: number;
}

export interface EvaluationSettings {
  autoApproveThreshold: number;
  maxAgeDays: number;
}

export interface DuplicateCheckInput {
  exactDuplicateExists: boolean;
  nearDuplicateImageHash: boolean;
}

const OCR_CONFIDENCE_FLOOR = 0.5;
const OCR_TOTAL_TOLERANCE_RAND = 1;

export function checkDuplicate(dup: DuplicateCheckInput): FlagReason | null {
  return dup.exactDuplicateExists || dup.nearDuplicateImageHash ? 'duplicate' : null;
}

export function checkDateRange(slipDateIso: string, now: Date, maxAgeDays: number): FlagReason | null {
  const slipDate = new Date(slipDateIso);
  if (slipDate.getTime() > now.getTime()) return 'date_out_of_range';
  const ageDays = (now.getTime() - slipDate.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays ? 'date_out_of_range' : null;
}

// OCR failure covers both "OCR never ran" (ocrConfidence null) and "ran but
// extracted nothing usable" — either way there's nothing to cross-check
// against, so this takes priority over the mismatch checks below rather
// than stacking with them.
export function checkOcrFailure(slip: Pick<SlipForEvaluation, 'ocrConfidence' | 'ocrTotal' | 'ocrDate' | 'ocrSupplierName'>): FlagReason | null {
  if (slip.ocrConfidence === null || slip.ocrConfidence < OCR_CONFIDENCE_FLOOR) return 'ocr_failed';
  if (slip.ocrTotal === null && slip.ocrDate === null && slip.ocrSupplierName === null) return 'ocr_failed';
  return null;
}

export function checkOcrMismatch(ocrTotal: number | null, totalAmount: number): FlagReason | null {
  if (ocrTotal === null) return null;
  return Math.abs(ocrTotal - totalAmount) > OCR_TOTAL_TOLERANCE_RAND ? 'ocr_mismatch' : null;
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function checkSupplierMismatch(ocrSupplierName: string | null, supplierName: string): FlagReason | null {
  if (!ocrSupplierName) return null;
  const a = normalizeName(ocrSupplierName);
  const b = normalizeName(supplierName);
  if (!a || !b) return null;
  return a.includes(b) || b.includes(a) ? null : 'supplier_mismatch';
}

// Hamming distance between two equal-length hex strings — popcount of the
// XOR, nibble by nibble.
const NIBBLE_POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += NIBBLE_POPCOUNT[x];
  }
  return dist;
}

export function isNearDuplicateHash(hash: string, others: string[], threshold = 6): boolean {
  return others.some((h) => hammingDistanceHex(hash, h) <= threshold);
}

export interface EvaluationResult {
  outcome: 'approved' | 'pending' | 'rejected';
  flaggedReasons: FlagReason[];
  rejectReason?: string;
  rewardPctLocked?: number;
  rewardAmount?: number;
}

export function evaluateSlip(params: {
  slip: SlipForEvaluation;
  supplier: SupplierForEvaluation;
  settings: EvaluationSettings;
  now: Date;
  duplicate: DuplicateCheckInput;
}): EvaluationResult {
  const { slip, supplier, settings, now, duplicate } = params;

  // A hard supplier-defined rule, not a judgment call — never enters the
  // review queue (plan doc, Approval Rules).
  if (slip.totalAmount < supplier.minSlipAmount) {
    return {
      outcome: 'rejected',
      flaggedReasons: [],
      rejectReason: `Below this supplier's minimum slip amount of R${supplier.minSlipAmount.toLocaleString()}`,
    };
  }

  const flags: FlagReason[] = [];

  const dup = checkDuplicate(duplicate);
  if (dup) flags.push(dup);

  const dateFlag = checkDateRange(slip.slipDate, now, settings.maxAgeDays);
  if (dateFlag) flags.push(dateFlag);

  const ocrFail = checkOcrFailure(slip);
  if (ocrFail) {
    flags.push(ocrFail);
  } else {
    const mismatch = checkOcrMismatch(slip.ocrTotal, slip.totalAmount);
    if (mismatch) flags.push(mismatch);
    const supplierFlag = checkSupplierMismatch(slip.ocrSupplierName, supplier.name);
    if (supplierFlag) flags.push(supplierFlag);
  }

  if (slip.totalAmount >= settings.autoApproveThreshold) {
    flags.push('over_threshold');
  }

  if (flags.length === 0) {
    const rewardAmount = Math.round(slip.totalAmount * supplier.rewardPct * 100) / 100;
    return { outcome: 'approved', flaggedReasons: [], rewardPctLocked: supplier.rewardPct, rewardAmount };
  }

  return { outcome: 'pending', flaggedReasons: flags };
}
