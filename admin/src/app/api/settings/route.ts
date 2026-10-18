import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("commission_pct, reward_auto_approve_threshold, reward_slip_max_age_days, payment_release_hours, updated_at")
    .eq("id", true)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { commissionPct, rewardAutoApproveThreshold, rewardSlipMaxAgeDays, paymentReleaseHours } = await req.json();

  if (typeof commissionPct !== "number" || commissionPct < 0 || commissionPct > 1) {
    return NextResponse.json({ error: "commissionPct must be a number between 0 and 1" }, { status: 400 });
  }
  if (rewardAutoApproveThreshold !== undefined && (typeof rewardAutoApproveThreshold !== "number" || rewardAutoApproveThreshold < 0)) {
    return NextResponse.json({ error: "rewardAutoApproveThreshold must be a non-negative number" }, { status: 400 });
  }
  if (rewardSlipMaxAgeDays !== undefined && (typeof rewardSlipMaxAgeDays !== "number" || rewardSlipMaxAgeDays < 1)) {
    return NextResponse.json({ error: "rewardSlipMaxAgeDays must be a positive number" }, { status: 400 });
  }
  if (paymentReleaseHours !== undefined && (typeof paymentReleaseHours !== "number" || paymentReleaseHours < 1)) {
    return NextResponse.json({ error: "paymentReleaseHours must be a positive number" }, { status: 400 });
  }

  const update: Record<string, unknown> = { commission_pct: commissionPct, updated_at: new Date().toISOString() };
  if (rewardAutoApproveThreshold !== undefined) update.reward_auto_approve_threshold = rewardAutoApproveThreshold;
  if (rewardSlipMaxAgeDays !== undefined) update.reward_slip_max_age_days = rewardSlipMaxAgeDays;
  if (paymentReleaseHours !== undefined) update.payment_release_hours = paymentReleaseHours;

  const { error } = await supabase
    .from("platform_settings")
    .update(update)
    .eq("id", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminId: admin.id,
      action: "settings.update",
      targetTable: "platform_settings",
      targetId: "true",
      details: { commissionPct, rewardAutoApproveThreshold, rewardSlipMaxAgeDays, paymentReleaseHours },
    });
  }

  return NextResponse.json({ success: true });
}
