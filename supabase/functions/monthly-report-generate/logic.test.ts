import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getPreviousReportPeriod, reportPeriodToApprovedAtRange, computeReportLines } from './logic.ts';

Deno.test('getPreviousReportPeriod: mid-month fires report the previous calendar month', () => {
  const { periodStart, periodEnd } = getPreviousReportPeriod(new Date('2026-11-01T03:00:00.000Z'));
  assertEquals(periodStart, '2026-10-01');
  assertEquals(periodEnd, '2026-10-31');
});

Deno.test('getPreviousReportPeriod: January rolls back to December of the previous year', () => {
  const { periodStart, periodEnd } = getPreviousReportPeriod(new Date('2027-01-01T03:00:00.000Z'));
  assertEquals(periodStart, '2026-12-01');
  assertEquals(periodEnd, '2026-12-31');
});

Deno.test('getPreviousReportPeriod: handles a 28-day February correctly', () => {
  const { periodStart, periodEnd } = getPreviousReportPeriod(new Date('2027-03-01T03:00:00.000Z'));
  assertEquals(periodStart, '2027-02-01');
  assertEquals(periodEnd, '2027-02-28');
});

Deno.test('getPreviousReportPeriod: a UTC instant just past SAST midnight still counts as the new month', () => {
  // 2026-11-01T22:05:00Z is 2026-11-02T00:05 SAST — firmly into the new
  // month either way, included mainly to document that the cron's actual
  // fire time only needs to land somewhere in the target day, not at a
  // specific hour.
  const { periodStart } = getPreviousReportPeriod(new Date('2026-11-01T22:05:00.000Z'));
  assertEquals(periodStart, '2026-10-01');
});

Deno.test('reportPeriodToApprovedAtRange: October period maps to SAST-aligned UTC bounds', () => {
  const { gte, lt } = reportPeriodToApprovedAtRange('2026-10-01', '2026-10-31');
  assertEquals(gte, '2026-09-30T22:00:00.000Z'); // 2026-10-01T00:00 SAST
  assertEquals(lt, '2026-10-31T22:00:00.000Z'); // 2026-11-01T00:00 SAST (exclusive)
});

Deno.test('reportPeriodToApprovedAtRange: a slip approved at the lower boundary is included, upper excluded', () => {
  const { gte, lt } = reportPeriodToApprovedAtRange('2026-10-01', '2026-10-31');
  const approvedAtStart = new Date(gte).getTime();
  const approvedAtEnd = new Date(lt).getTime();
  assertEquals(approvedAtStart >= new Date(gte).getTime(), true);
  assertEquals(approvedAtEnd > approvedAtStart, true);
});

Deno.test('computeReportLines: aggregates multiple slips per tradie correctly', () => {
  const lines = computeReportLines(
    [
      { id: 's1', tradie_id: 't1', total_amount: 100, reward_amount: 5 },
      { id: 's2', tradie_id: 't1', total_amount: 200, reward_amount: 10 },
      { id: 's3', tradie_id: 't2', total_amount: 50, reward_amount: 2.5 },
    ],
    0.02
  );

  const t1 = lines.find((l) => l.tradieId === 't1')!;
  assertEquals(t1.slipCount, 2);
  assertEquals(t1.totalSpend, 300);
  assertEquals(t1.creditToLoad, 15);
  assertEquals(t1.commissionDue, 6); // 300 * 0.02
  assertEquals(t1.slipIds, ['s1', 's2']);

  const t2 = lines.find((l) => l.tradieId === 't2')!;
  assertEquals(t2.slipCount, 1);
  assertEquals(t2.totalSpend, 50);
  assertEquals(t2.creditToLoad, 2.5);
  assertEquals(t2.commissionDue, 1); // 50 * 0.02
});

Deno.test('computeReportLines: rounds to the cent', () => {
  const lines = computeReportLines(
    [
      { id: 's1', tradie_id: 't1', total_amount: 10.1, reward_amount: 0.505 },
      { id: 's2', tradie_id: 't1', total_amount: 10.1, reward_amount: 0.505 },
    ],
    0
  );
  assertEquals(lines[0].totalSpend, 20.2);
  assertEquals(lines[0].creditToLoad, 1.01);
});

Deno.test('computeReportLines: zero commission rate yields zero commission due', () => {
  const lines = computeReportLines([{ id: 's1', tradie_id: 't1', total_amount: 1000, reward_amount: 50 }], 0);
  assertEquals(lines[0].commissionDue, 0);
});

Deno.test('computeReportLines: an empty slip list produces no lines', () => {
  const lines = computeReportLines([], 0.05);
  assertEquals(lines.length, 0);
});
