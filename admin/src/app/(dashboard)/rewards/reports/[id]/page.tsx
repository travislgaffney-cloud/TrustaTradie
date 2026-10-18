import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ReportDetail } from "./report-detail";

export const dynamic = "force-dynamic";

async function getReport(id: string) {
  const { data: report } = await supabase
    .from("supplier_reports")
    .select("id, period_start, period_end, generated_at, sent_at, access_token, supplier:suppliers(name, report_emails)")
    .eq("id", id)
    .single();
  if (!report) return null;

  const { data: lines } = await supabase
    .from("supplier_report_lines")
    .select("id, account_number, slip_count, total_spend, reward_pct, credit_to_load, commission_due, loaded_at, tradie:profiles(full_name)")
    .eq("report_id", id)
    .order("created_at");

  const supplier = Array.isArray(report.supplier) ? report.supplier[0] : report.supplier;

  return {
    id: report.id,
    periodStart: report.period_start,
    periodEnd: report.period_end,
    generatedAt: report.generated_at,
    sentAt: report.sent_at,
    supplierName: supplier?.name ?? "Unknown supplier",
    reportEmails: supplier?.report_emails ?? [],
    lines: (lines ?? []).map((l: any) => ({
      id: l.id,
      tradieName: (Array.isArray(l.tradie) ? l.tradie[0] : l.tradie)?.full_name ?? "Unknown tradie",
      accountNumber: l.account_number,
      slipCount: l.slip_count,
      totalSpend: Number(l.total_spend),
      rewardPct: Number(l.reward_pct),
      creditToLoad: Number(l.credit_to_load),
      commissionDue: Number(l.commission_due),
      loadedAt: l.loaded_at,
    })),
  };
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{report.supplierName}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {report.periodStart} – {report.periodEnd} · generated {new Date(report.generatedAt).toLocaleString()}
      </p>
      <ReportDetail report={report} />
    </div>
  );
}
