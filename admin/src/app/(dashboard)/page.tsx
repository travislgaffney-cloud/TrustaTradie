import { supabase } from "@/lib/supabase";
import { StatCard, type WeeklyTrend } from "@/components/stat-card";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function weeklyTrend(thisWeek: number, lastWeek: number): WeeklyTrend {
  if (lastWeek === 0) return { pctChange: null, thisWeek };
  return { pctChange: ((thisWeek - lastWeek) / lastWeek) * 100, thisWeek };
}

async function countInRange(table: string, column: string, start: string, end: string, eq?: [string, string]) {
  let q = supabase.from(table).select("*", { count: "exact", head: true }).gte(column, start).lt(column, end);
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count } = await q;
  return count ?? 0;
}

// transaction_status_history.changed_at is the one reliable source for
// "when did this amount of money move" — transactions.updated_at gets
// touched by any status change, not specifically the one we care about.
interface TxnAmountRow {
  transactions: { quoted_amount: number; commission_pct: number } | { quoted_amount: number; commission_pct: number }[] | null;
}

async function capturedAmountInRange(status: "funds_held" | "released", start: string, end: string): Promise<TxnAmountRow[]> {
  const { data } = await supabase
    .from("transaction_status_history")
    .select("transactions(quoted_amount, commission_pct)")
    .eq("status", status)
    .gte("changed_at", start)
    .lt("changed_at", end);
  return (data ?? []) as unknown as TxnAmountRow[];
}

// Postgrest's inferred type for this embed is an array even though the FK
// makes it a to-one relationship — normalize both shapes rather than
// trust whichever one TypeScript happens to infer.
function oneTxn(row: TxnAmountRow): { quoted_amount: number; commission_pct: number } | null {
  const t = row.transactions;
  if (!t) return null;
  return Array.isArray(t) ? t[0] ?? null : t;
}

const sumQuoted = (rows: TxnAmountRow[]) => rows.reduce((s, r) => s + Number(oneTxn(r)?.quoted_amount ?? 0), 0);
const sumFees = (rows: TxnAmountRow[]) =>
  rows.reduce((s, r) => {
    const t = oneTxn(r);
    return s + Number(t?.quoted_amount ?? 0) * Number(t?.commission_pct ?? 0);
  }, 0);

async function getStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS).toISOString();
  const nowIso = now.toISOString();

  const [
    { count: totalUsers },
    { count: totalCustomers },
    { count: totalTradies },
    { count: totalJobs },
    { count: openJobs },
    { count: inProgressJobs },
    { count: completedJobs },
    { count: totalQuotes },
    { count: pendingDocs },
    { count: pendingPayouts },
    { count: disputedJobs },
    { count: unresolvedBugs },
    { data: capturedEver },
    { data: releasedEver },
    { data: escrowNow },
    usersThisWeek, usersLastWeek,
    customersThisWeek, customersLastWeek,
    tradiesThisWeek, tradiesLastWeek,
    jobsThisWeek, jobsLastWeek,
    quotesThisWeek, quotesLastWeek,
    disputesThisWeek, disputesLastWeek,
    bugsThisWeek, bugsLastWeek,
    capturedThisWeek, capturedLastWeek,
    releasedThisWeek, releasedLastWeek,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "tradie"),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    supabase.from("tradie_documents").select("*", { count: "exact", head: true }).eq("is_verified", false),
    supabase.from("pending_payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "disputed"),
    supabase.from("bug_reports").select("*", { count: "exact", head: true }).eq("resolved", false),
    // Revenue/fees/escrow come from the real transaction ledger — there
    // never was a "payments" table in this schema, so every revenue
    // figure on this page had always silently shown R0 before this fix.
    supabase.from("transactions").select("quoted_amount").in("status", ["funds_held", "completed_by_provider", "confirmed_by_customer", "released"]),
    supabase.from("transactions").select("quoted_amount, commission_pct").eq("status", "released"),
    supabase.from("transactions").select("quoted_amount").in("status", ["funds_held", "completed_by_provider", "confirmed_by_customer"]),
    countInRange("profiles", "created_at", weekAgo, nowIso),
    countInRange("profiles", "created_at", twoWeeksAgo, weekAgo),
    countInRange("profiles", "created_at", weekAgo, nowIso, ["role", "customer"]),
    countInRange("profiles", "created_at", twoWeeksAgo, weekAgo, ["role", "customer"]),
    countInRange("profiles", "created_at", weekAgo, nowIso, ["role", "tradie"]),
    countInRange("profiles", "created_at", twoWeeksAgo, weekAgo, ["role", "tradie"]),
    countInRange("jobs", "created_at", weekAgo, nowIso),
    countInRange("jobs", "created_at", twoWeeksAgo, weekAgo),
    countInRange("quotes", "created_at", weekAgo, nowIso),
    countInRange("quotes", "created_at", twoWeeksAgo, weekAgo),
    countInRange("dispute_reports", "created_at", weekAgo, nowIso),
    countInRange("dispute_reports", "created_at", twoWeeksAgo, weekAgo),
    countInRange("bug_reports", "created_at", weekAgo, nowIso),
    countInRange("bug_reports", "created_at", twoWeeksAgo, weekAgo),
    capturedAmountInRange("funds_held", weekAgo, nowIso),
    capturedAmountInRange("funds_held", twoWeeksAgo, weekAgo),
    capturedAmountInRange("released", weekAgo, nowIso),
    capturedAmountInRange("released", twoWeeksAgo, weekAgo),
  ]);

  const totalRevenue = (capturedEver ?? []).reduce((s: number, t: any) => s + Number(t.quoted_amount ?? 0), 0);
  const platformFees = (releasedEver ?? []).reduce((s: number, t: any) => s + Number(t.quoted_amount ?? 0) * Number(t.commission_pct ?? 0), 0);
  const escrowHeld = (escrowNow ?? []).reduce((s: number, t: any) => s + Number(t.quoted_amount ?? 0), 0);

  return {
    totalUsers: totalUsers ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalTradies: totalTradies ?? 0,
    totalJobs: totalJobs ?? 0,
    openJobs: openJobs ?? 0,
    inProgressJobs: inProgressJobs ?? 0,
    completedJobs: completedJobs ?? 0,
    totalQuotes: totalQuotes ?? 0,
    pendingDocs: pendingDocs ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
    disputedJobs: disputedJobs ?? 0,
    unresolvedBugs: unresolvedBugs ?? 0,
    totalRevenue,
    platformFees,
    escrowHeld,
    trends: {
      users: weeklyTrend(usersThisWeek, usersLastWeek),
      customers: weeklyTrend(customersThisWeek, customersLastWeek),
      tradies: weeklyTrend(tradiesThisWeek, tradiesLastWeek),
      jobs: weeklyTrend(jobsThisWeek, jobsLastWeek),
      quotes: weeklyTrend(quotesThisWeek, quotesLastWeek),
      disputes: weeklyTrend(disputesThisWeek, disputesLastWeek),
      bugs: weeklyTrend(bugsThisWeek, bugsLastWeek),
      revenue: weeklyTrend(sumQuoted(capturedThisWeek), sumQuoted(capturedLastWeek)),
      fees: weeklyTrend(sumFees(releasedThisWeek), sumFees(releasedLastWeek)),
    },
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">TrustaTradie platform overview</p>

      {/* Action alerts */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {stats.pendingDocs > 0 && (
          <a href="/documents" className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 font-medium hover:bg-amber-100 transition">
            📄 {stats.pendingDocs} document{stats.pendingDocs !== 1 ? "s" : ""} awaiting review
          </a>
        )}
        {stats.pendingPayouts > 0 && (
          <a href="/payouts" className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800 font-medium hover:bg-blue-100 transition">
            💰 {stats.pendingPayouts} payout{stats.pendingPayouts !== 1 ? "s" : ""} to process
          </a>
        )}
        {stats.disputedJobs > 0 && (
          <a href="/disputes" className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-800 font-medium hover:bg-red-100 transition">
            ⚖️ {stats.disputedJobs} active dispute{stats.disputedJobs !== 1 ? "s" : ""}
          </a>
        )}
        {stats.unresolvedBugs > 0 && (
          <a href="/bug-reports" className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-sm text-purple-800 font-medium hover:bg-purple-100 transition">
            🐛 {stats.unresolvedBugs} unresolved bug report{stats.unresolvedBugs !== 1 ? "s" : ""}
          </a>
        )}
      </div>

      {/* Users */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Users</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="text-gray-900" trend={stats.trends.users} />
        <StatCard icon="🏠" label="Customers" value={stats.totalCustomers} color="text-blue-700" trend={stats.trends.customers} />
        <StatCard icon="🔧" label="Tradies" value={stats.totalTradies} color="text-green-700" trend={stats.trends.tradies} />
      </div>

      {/* Jobs */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Jobs</h2>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="📋" label="Total Jobs" value={stats.totalJobs} color="text-gray-900" trend={stats.trends.jobs} />
        <StatCard icon="🟢" label="Open" value={stats.openJobs} color="text-emerald-600" sub="current" />
        <StatCard icon="🔨" label="In Progress" value={stats.inProgressJobs} color="text-amber-600" sub="current" />
        <StatCard icon="✅" label="Completed" value={stats.completedJobs} color="text-blue-600" sub="current" />
      </div>

      {/* Revenue */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="💵" label="Total Revenue" value={`R${stats.totalRevenue.toLocaleString()}`} color="text-green-700" trend={stats.trends.revenue} />
        <StatCard icon="🏦" label="Platform Fees Earned" value={`R${stats.platformFees.toLocaleString()}`} color="text-purple-700" trend={stats.trends.fees} />
        <StatCard icon="🔒" label="Held in Escrow" value={`R${stats.escrowHeld.toLocaleString()}`} color="text-amber-700" sub="current" />
      </div>

      {/* Activity */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Activity</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📝" label="Total Quotes" value={stats.totalQuotes} color="text-gray-900" trend={stats.trends.quotes} />
        <StatCard icon="📄" label="Pending Documents" value={stats.pendingDocs} color="text-amber-600" sub="current" />
        <StatCard icon="⚖️" label="Disputes Raised" value={stats.disputedJobs} color="text-red-600" trend={stats.trends.disputes} />
        <StatCard icon="🐛" label="Bug Reports" value={stats.unresolvedBugs} color="text-purple-600" trend={stats.trends.bugs} />
      </div>
    </div>
  );
}
