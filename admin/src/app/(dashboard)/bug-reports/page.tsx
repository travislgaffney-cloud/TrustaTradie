import { supabase } from "@/lib/supabase";
import { BugReportList } from "./bug-report-list";

export const dynamic = "force-dynamic";

async function getBugReports() {
  const { data } = await supabase
    .from("bug_reports")
    .select("*, user:profiles!bug_reports_user_id_fkey(full_name, role, phone)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function BugReportsPage() {
  const reports = await getBugReports();
  const unresolved = reports.filter((r: any) => !r.resolved);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Bug Reports</h1>
      <p className="text-sm text-gray-500 mb-6">
        Diagnostic reports from app users
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Reports</p>
          <p className="text-2xl font-black text-gray-900">{reports.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">Unresolved</p>
          <p className="text-2xl font-black text-red-900">{unresolved.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">Resolved</p>
          <p className="text-2xl font-black text-green-900">{reports.length - unresolved.length}</p>
        </div>
      </div>

      <BugReportList reports={reports} />
    </div>
  );
}
