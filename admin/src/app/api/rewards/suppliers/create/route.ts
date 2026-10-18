import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { name, reportEmails, rewardPct, commissionPct, minSlipAmount } = await req.json();
  if (!name || typeof rewardPct !== "number") {
    return NextResponse.json({ error: "Missing name or rewardPct" }, { status: 400 });
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      report_emails: reportEmails ?? [],
      reward_pct: rewardPct,
      commission_pct: commissionPct ?? 0,
      min_slip_amount: minSlipAmount ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "supplier.create",
    targetTable: "suppliers",
    targetId: supplier.id,
    details: { name, rewardPct, commissionPct, minSlipAmount },
  });

  return NextResponse.json({ success: true, supplier });
}
