import { supabase } from "@/lib/supabase";
import { ReportList } from "./report-list";

export const dynamic = "force-dynamic";

async function getReports() {
  const { data } = await supabase
    .from("supplier_reports")
    .select("id, period_start, period_end, generated_at, sent_at, supplier:suppliers(name), lines:supplier_report_lines(id, loaded_at, credit_to_load)")
    .order("period_start", { ascending: false });

  return (data ?? []).map((r: any) => {
    const supplier = Array.isArray(r.supplier) ? r.supplier[0] : r.supplier;
    const lines = r.lines ?? [];
    return {
      id: r.id,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      generatedAt: r.generated_at,
      sentAt: r.sent_at,
      supplierName: supplier?.name ?? "Unknown supplier",
      lineCount: lines.length,
      confirmedCount: lines.filter((l: any) => l.loaded_at).length,
      totalCredit: lines.reduce((sum: number, l: any) => sum + Number(l.credit_to_load), 0),
    };
  });
}

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Supplier Reward Reports</h1>
      <p className="text-sm text-gray-500 mb-6">
        Monthly reports generated for each active supplier, by approval month.
      </p>
      <ReportList reports={reports} />
    </div>
  );
}
