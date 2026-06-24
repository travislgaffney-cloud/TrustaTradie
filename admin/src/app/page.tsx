import { supabase } from "@/lib/supabase";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

async function getStats() {
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
    { data: payments },
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
    supabase.from("payments").select("amount_total, platform_fee, status"),
  ]);

  const paymentList = payments ?? [];
  const totalRevenue = paymentList
    .filter((p: any) => p.status === "released" || p.status === "held_in_escrow")
    .reduce((s: number, p: any) => s + (p.amount_total ?? 0), 0);
  const platformFees = paymentList
    .filter((p: any) => p.status === "released")
    .reduce((s: number, p: any) => s + (p.platform_fee ?? 0), 0);
  const escrowHeld = paymentList
    .filter((p: any) => p.status === "held_in_escrow")
    .reduce((s: number, p: any) => s + (p.amount_total ?? 0), 0);

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
    totalRevenue,
    platformFees,
    escrowHeld,
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
      </div>

      {/* Users */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Users</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="text-gray-900" />
        <StatCard icon="🏠" label="Customers" value={stats.totalCustomers} color="text-blue-700" />
        <StatCard icon="🔧" label="Tradies" value={stats.totalTradies} color="text-green-700" />
      </div>

      {/* Jobs */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Jobs</h2>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="📋" label="Total Jobs" value={stats.totalJobs} color="text-gray-900" />
        <StatCard icon="🟢" label="Open" value={stats.openJobs} color="text-emerald-600" />
        <StatCard icon="🔨" label="In Progress" value={stats.inProgressJobs} color="text-amber-600" />
        <StatCard icon="✅" label="Completed" value={stats.completedJobs} color="text-blue-600" />
      </div>

      {/* Revenue */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="💵" label="Total Revenue" value={`R${stats.totalRevenue.toLocaleString()}`} color="text-green-700" />
        <StatCard icon="🏦" label="Platform Fees Earned" value={`R${stats.platformFees.toLocaleString()}`} color="text-purple-700" />
        <StatCard icon="🔒" label="Held in Escrow" value={`R${stats.escrowHeld.toLocaleString()}`} color="text-amber-700" />
      </div>

      {/* Activity */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Activity</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📝" label="Total Quotes" value={stats.totalQuotes} color="text-gray-900" />
        <StatCard icon="📄" label="Pending Documents" value={stats.pendingDocs} color="text-amber-600" />
        <StatCard icon="⚖️" label="Active Disputes" value={stats.disputedJobs} color="text-red-600" />
      </div>
    </div>
  );
}
