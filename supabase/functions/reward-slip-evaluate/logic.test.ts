import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  checkDuplicate,
  checkDateRange,
  checkOcrFailure,
  checkOcrMismatch,
  checkSupplierMismatch,
  hammingDistanceHex,
  isNearDuplicateHash,
  evaluateSlip,
  type SlipForEvaluation,
} from './logic.ts';

const NOW = new Date('2026-10-18T12:00:00Z');

const GOOD_SLIP: SlipForEvaluation = {
  totalAmount: 500,
  slipDate: '2026-10-15',
  ocrSupplierName: 'Builders Warehouse',
  ocrTotal: 500,
  ocrDate: '2026-10-15',
  ocrConfidence: 0.95,
};

const SUPPLIER = { name: 'Builders Warehouse', rewardPct: 0.05, minSlipAmount: 50 };
const SETTINGS = { autoApproveThreshold: 5000, maxAgeDays: 60 };
const NO_DUPLICATE = { exactDuplicateExists: false, nearDuplicateImageHash: false };

Deno.test('checkDuplicate - flags on exact match or near-duplicate image hash', () => {
  assertEquals(checkDuplicate({ exactDuplicateExists: true, nearDuplicateImageHash: false }), 'duplicate');
  assertEquals(checkDuplicate({ exactDuplicateExists: false, nearDuplicateImageHash: true }), 'duplicate');
  assertEquals(checkDuplicate(NO_DUPLICATE), null);
});

Deno.test('checkDateRange - rejects a future date', () => {
  assertEquals(checkDateRange('2026-11-01', NOW, 60), 'date_out_of_range');
});

Deno.test('checkDateRange - rejects a slip older than the configured window', () => {
  assertEquals(checkDateRange('2026-01-01', NOW, 60), 'date_out_of_range');
});

Deno.test('checkDateRange - allows a recent, past date within the window', () => {
  assertEquals(checkDateRange('2026-10-15', NOW, 60), null);
});

Deno.test('checkDateRange - a date exactly at the boundary is still allowed', () => {
  // Deliberately midnight-to-midnight here, not the shared noon NOW — slip_date
  // is a DATE column (parses to midnight UTC) and clock time-of-day shouldn't
  // make an otherwise-exact 60-day-old slip flip to flagged.
  const nowAtMidnight = new Date('2026-10-18T00:00:00Z');
  const boundary = new Date(nowAtMidnight.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assertEquals(checkDateRange(boundary, nowAtMidnight, 60), null);
});

Deno.test('checkDateRange - one day past the boundary is flagged', () => {
  const nowAtMidnight = new Date('2026-10-18T00:00:00Z');
  const justOver = new Date(nowAtMidnight.getTime() - 61 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assertEquals(checkDateRange(justOver, nowAtMidnight, 60), 'date_out_of_range');
});

Deno.test('checkOcrFailure - flags when OCR never produced a confidence score', () => {
  assertEquals(
    checkOcrFailure({ ocrConfidence: null, ocrTotal: null, ocrDate: null, ocrSupplierName: null }),
    'ocr_failed'
  );
});

Deno.test('checkOcrFailure - flags when confidence is below the floor', () => {
  assertEquals(
    checkOcrFailure({ ocrConfidence: 0.2, ocrTotal: 500, ocrDate: '2026-10-15', ocrSupplierName: 'X' }),
    'ocr_failed'
  );
});

Deno.test('checkOcrFailure - flags when every extracted field is null despite a confidence score', () => {
  assertEquals(
    checkOcrFailure({ ocrConfidence: 0.9, ocrTotal: null, ocrDate: null, ocrSupplierName: null }),
    'ocr_failed'
  );
});

Deno.test('checkOcrFailure - passes with a confident, non-empty extraction', () => {
  assertEquals(
    checkOcrFailure({ ocrConfidence: 0.9, ocrTotal: 500, ocrDate: '2026-10-15', ocrSupplierName: 'X' }),
    null
  );
});

Deno.test('checkOcrMismatch - flags a difference beyond the rounding tolerance', () => {
  assertEquals(checkOcrMismatch(500, 450), 'ocr_mismatch');
});

Deno.test('checkOcrMismatch - allows a small rounding difference', () => {
  assertEquals(checkOcrMismatch(500, 500.5), null);
});

Deno.test('checkOcrMismatch - skipped (not this check\'s job) when OCR has no total at all', () => {
  assertEquals(checkOcrMismatch(null, 450), null);
});

Deno.test('checkSupplierMismatch - allows a case/punctuation-insensitive match', () => {
  assertEquals(checkSupplierMismatch('BUILDERS WAREHOUSE', 'Builders Warehouse'), null);
});

Deno.test('checkSupplierMismatch - allows one name containing the other', () => {
  assertEquals(checkSupplierMismatch('Builders Warehouse (Pty) Ltd', 'Builders Warehouse'), null);
});

Deno.test('checkSupplierMismatch - flags an unrelated name', () => {
  assertEquals(checkSupplierMismatch('Cashbuild', 'Builders Warehouse'), 'supplier_mismatch');
});

Deno.test('checkSupplierMismatch - skipped when OCR extracted no supplier name', () => {
  assertEquals(checkSupplierMismatch(null, 'Builders Warehouse'), null);
});

Deno.test('hammingDistanceHex - identical hashes are distance 0', () => {
  assertEquals(hammingDistanceHex('abcd1234', 'abcd1234'), 0);
});

Deno.test('hammingDistanceHex - counts differing bits across nibbles', () => {
  // 0x0 vs 0xf differs in all 4 bits of one nibble
  assertEquals(hammingDistanceHex('0000', 'f000'), 4);
});

Deno.test('hammingDistanceHex - mismatched lengths are never considered close', () => {
  assertEquals(hammingDistanceHex('ab', 'abcd'), Infinity);
});

Deno.test('isNearDuplicateHash - true when any candidate is within the threshold', () => {
  assertEquals(isNearDuplicateHash('0000', ['f000', '1111'], 6), true);
});

Deno.test('isNearDuplicateHash - false when every candidate is far', () => {
  assertEquals(isNearDuplicateHash('0000', ['ffff'], 6), false);
});

Deno.test('evaluateSlip - a clean slip under the threshold auto-approves with the reward locked in', () => {
  const result = evaluateSlip({ slip: GOOD_SLIP, supplier: SUPPLIER, settings: SETTINGS, now: NOW, duplicate: NO_DUPLICATE });
  assertEquals(result.outcome, 'approved');
  assertEquals(result.flaggedReasons, []);
  assertEquals(result.rewardPctLocked, 0.05);
  assertEquals(result.rewardAmount, 25);
});

Deno.test('evaluateSlip - below the supplier minimum rejects immediately, no flags', () => {
  const result = evaluateSlip({
    slip: { ...GOOD_SLIP, totalAmount: 10 },
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: NO_DUPLICATE,
  });
  assertEquals(result.outcome, 'rejected');
  assertEquals(result.flaggedReasons, []);
  assertEquals(result.rejectReason, "Below this supplier's minimum slip amount of R50");
});

Deno.test('evaluateSlip - at or above the auto-approve threshold always goes to review', () => {
  const result = evaluateSlip({
    slip: { ...GOOD_SLIP, totalAmount: 5000, ocrTotal: 5000 },
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: NO_DUPLICATE,
  });
  assertEquals(result.outcome, 'pending');
  assertEquals(result.flaggedReasons, ['over_threshold']);
});

Deno.test('evaluateSlip - a duplicate image hash goes to review even under the threshold', () => {
  const result = evaluateSlip({
    slip: GOOD_SLIP,
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: { exactDuplicateExists: false, nearDuplicateImageHash: true },
  });
  assertEquals(result.outcome, 'pending');
  assertEquals(result.flaggedReasons, ['duplicate']);
});

Deno.test('evaluateSlip - multiple simultaneous flags are all recorded, not just the first', () => {
  const result = evaluateSlip({
    slip: { ...GOOD_SLIP, slipDate: '2026-01-01', ocrTotal: 100 },
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: NO_DUPLICATE,
  });
  assertEquals(result.outcome, 'pending');
  assertEquals(result.flaggedReasons, ['date_out_of_range', 'ocr_mismatch']);
});

Deno.test('evaluateSlip - OCR failure takes priority over mismatch checks rather than stacking with them', () => {
  const result = evaluateSlip({
    slip: { ...GOOD_SLIP, ocrConfidence: null, ocrTotal: null, ocrSupplierName: null },
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: NO_DUPLICATE,
  });
  assertEquals(result.outcome, 'pending');
  assertEquals(result.flaggedReasons, ['ocr_failed']);
});

Deno.test('evaluateSlip - the minimum-amount check is evaluated before any flag, even if other checks would also fail', () => {
  const result = evaluateSlip({
    slip: { ...GOOD_SLIP, totalAmount: 10, slipDate: '2020-01-01' },
    supplier: SUPPLIER,
    settings: SETTINGS,
    now: NOW,
    duplicate: NO_DUPLICATE,
  });
  assertEquals(result.outcome, 'rejected');
});
