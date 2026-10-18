import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

// Rate changes only ever apply going forward — reward_slips.reward_pct_locked
// (Phase 2) freezes whatever suppliers.reward_pct was at approval time, so
// updating it here never touches a slip that's already been approved.
export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { id, name, reportEmails, rewardPct, commissionPct, minSlipAmount } = await req.json();
  if (!id || !name || typeof rewardPct !== "number") {
    return NextResponse.json({ error: "Missing id, name, or rewardPct" }, { status: 400 });
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .update({
      name,
      report_emails: reportEmails ?? [],
      reward_pct: rewardPct,
      commission_pct: commissionPct ?? 0,
      min_slip_amount: minSlipAmount ?? 0,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "supplier.update",
    targetTable: "suppliers",
    targetId: id,
    details: { name, rewardPct, commissionPct, minSlipAmount },
  });

  return NextResponse.json({ success: true, supplier });
}
