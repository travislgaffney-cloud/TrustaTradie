import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";
import { sendEmail } from "@/lib/resend";

// Reuses the existing report row and access_token rather than regenerating
// anything — matches the plan's "a deliberate re-send only happens through
// the admin dashboard's Re-send button" design.
export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { reportId } = await req.json();
  if (!reportId) return NextResponse.json({ error: "Missing reportId" }, { status: 400 });

  const { data: report } = await supabase
    .from("supplier_reports")
    .select("id, period_start, period_end, access_token, supplier:suppliers(name, report_emails)")
    .eq("id", reportId)
    .single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const supplier = Array.isArray(report.supplier) ? report.supplier[0] : report.supplier;
  if (!supplier?.report_emails || supplier.report_emails.length === 0) {
    return NextResponse.json({ error: "This supplier has no report email configured" }, { status: 400 });
  }

  const { data: lines } = await supabase.from("supplier_report_lines").select("credit_to_load").eq("report_id", reportId);
  const totalCredit = (lines ?? []).reduce((sum, l) => sum + Number(l.credit_to_load), 0).toFixed(2);

  const siteUrl = process.env.ADMIN_SITE_URL ?? "https://admin-five-chi-53.vercel.app";
  const confirmUrl = `${siteUrl}/reports/confirm/${report.access_token}`;

  try {
    await sendEmail({
      to: supplier.report_emails,
      subject: `TrustaTradie: ${report.period_start.slice(0, 7)} reward report — R${totalCredit} to load (resent)`,
      html: `
        <p>Your TrustaTradie rewards report for ${report.period_start} to ${report.period_end} — R${totalCredit} total credit to load.</p>
        <p><a href="${confirmUrl}">View the report and confirm each tradie's credit as loaded</a></p>
      `,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Email send failed" }, { status: 502 });
  }

  await supabase.from("supplier_reports").update({ sent_at: new Date().toISOString() }).eq("id", reportId);

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "reward_report.resend",
    targetTable: "supplier_reports",
    targetId: reportId,
  });

  return NextResponse.json({ success: true });
}
