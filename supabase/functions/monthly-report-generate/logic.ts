// Pure logic for the monthly supplier report job, extracted so the period
// math and per-tradie aggregation can be unit tested without a live
// Supabase client or Deno.serve — mirrors tradesafe-webhook/logic.ts.

// South Africa has no DST, so SAST is a fixed UTC+2 offset. Report periods
// are calendar months in SAST, independent of the UTC instant the cron
// actually fires at.
export function getPreviousReportPeriod(now: Date): { periodStart: string; periodEnd: string } {
  const sastShifted = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const year = sastShifted.getUTCFullYear();
  const month = sastShifted.getUTCMonth(); // 0-indexed; "previous month" relative to `now`

  const periodStartDate = new Date(Date.UTC(year, month - 1, 1));
  const periodEndDate = new Date(Date.UTC(year, month, 0)); // day 0 of `month` = last day of `month - 1`

  return {
    periodStart: periodStartDate.toISOString().slice(0, 10),
    periodEnd: periodEndDate.toISOString().slice(0, 10),
  };
}

// A slip's reporting month is its approved_at calendar month (SAST), not its
// slip_date or submission date — see the plan doc's "Report-month
// assignment" section. This resolves the SAST calendar-day boundaries for a
// period (inclusive) as UTC instants, for use in an approved_at range query.
export function reportPeriodToApprovedAtRange(periodStart: string, periodEnd: string): { gte: string; lt: string } {
  // periodStart at 00:00 SAST == UTC-2h; periodEnd's exclusive upper bound
  // is the day AFTER periodEnd, at 00:00 SAST.
  const startUtc = new Date(`${periodStart}T00:00:00.000Z`);
  startUtc.setUTCHours(startUtc.getUTCHours() - 2);

  const endDate = new Date(`${periodEnd}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  endDate.setUTCHours(endDate.getUTCHours() - 2);

  return { gte: startUtc.toISOString(), lt: endDate.toISOString() };
}

export interface SlipForAggregation {
  id: string;
  tradie_id: string;
  total_amount: number;
  reward_amount: number;
}

export interface ReportLineComputed {
  tradieId: string;
  slipIds: string[];
  slipCount: number;
  totalSpend: number;
  creditToLoad: number;
  commissionDue: number;
}

// Groups a supplier's qualifying slips by tradie. commissionPct is the
// supplier's rate at generation time (commission isn't locked per-slip like
// reward_pct is, since it's money TrustaTradie charges the supplier, not a
// promise made to the tradie).
export function computeReportLines(slips: SlipForAggregation[], commissionPct: number): ReportLineComputed[] {
  const byTradie = new Map<string, SlipForAggregation[]>();
  for (const slip of slips) {
    const group = byTradie.get(slip.tradie_id) ?? [];
    group.push(slip);
    byTradie.set(slip.tradie_id, group);
  }

  const lines: ReportLineComputed[] = [];
  for (const [tradieId, group] of byTradie) {
    const totalSpend = round2(group.reduce((sum, s) => sum + s.total_amount, 0));
    const creditToLoad = round2(group.reduce((sum, s) => sum + s.reward_amount, 0));
    const commissionDue = round2(totalSpend * commissionPct);
    lines.push({
      tradieId,
      slipIds: group.map((s) => s.id),
      slipCount: group.length,
      totalSpend,
      creditToLoad,
      commissionDue,
    });
  }
  return lines;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
