import { supabase } from "@/lib/supabase";
import { ConfirmReport } from "./confirm-report";

export const dynamic = "force-dynamic";

// Public page — no admin session. Authenticated purely by the access_token
// in the URL (see middleware.ts's allowlist for this path), which is why
// every query here is scoped by token, never by an id alone.
async function getReportByToken(token: string) {
  const { data: report } = await supabase
    .from("supplier_reports")
    .select("id, period_start, period_end, token_expires_at, supplier:suppliers(name)")
    .eq("access_token", token)
    .single();
  if (!report) return { report: null, expired: false, lines: [] };

  const supplierPreview = Array.isArray(report.supplier) ? report.supplier[0] : report.supplier;
  const reportSummary = {
    id: report.id,
    periodStart: report.period_start,
    periodEnd: report.period_end,
    supplierName: supplierPreview?.name ?? "",
  };

  const expired = new Date(report.token_expires_at) < new Date();
  if (expired) return { report: reportSummary, expired: true, lines: [] };

  const { data: lines } = await supabase
    .from("supplier_report_lines")
    .select("id, account_number, slip_count, total_spend, credit_to_load, loaded_at, tradie:profiles(full_name)")
    .eq("report_id", report.id)
    .order("created_at");

  return {
    report: reportSummary,
    expired: false,
    lines: (lines ?? []).map((l: any) => ({
      id: l.id,
      tradieName: (Array.isArray(l.tradie) ? l.tradie[0] : l.tradie)?.full_name ?? "Unknown tradie",
      accountNumber: l.account_number,
      slipCount: l.slip_count,
      totalSpend: Number(l.total_spend),
      creditToLoad: Number(l.credit_to_load),
      loadedAt: l.loaded_at,
    })),
  };
}

export default async function ConfirmReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { report, expired, lines } = await getReportByToken(token);

  if (!report) {
    return <CenteredMessage title="Link not found" body="This report link is invalid." />;
  }
  if (expired) {
    return <CenteredMessage title="Link expired" body="This report link has expired. Contact TrustaTradie for a new one." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#1B2D4F] mb-1">{report.supplierName} — Reward Report</h1>
        <p className="text-sm text-gray-500 mb-6">
          {report.periodStart} – {report.periodEnd}
        </p>
        <ConfirmReport token={token} lines={lines} />
      </div>
    </div>
  );
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-sm text-gray-500">{body}</p>
      </div>
    </div>
  );
}
