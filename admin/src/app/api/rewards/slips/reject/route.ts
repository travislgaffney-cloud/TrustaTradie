import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

async function sendPush(userId: string, title: string, body: string, data: Record<string, string>) {
  const { data: profile } = await supabase.from("profiles").select("push_token").eq("id", userId).single();
  if (!profile?.push_token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: profile.push_token, title, body, data, sound: "default", priority: "high", channelId: "default" }),
    });
  } catch {
    // best-effort, in-app notification row is the source of truth
  }
}

export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { slipId, reason } = await req.json();
  if (!slipId || !reason) return NextResponse.json({ error: "Missing slipId or reason" }, { status: 400 });

  const { data: slip } = await supabase
    .from("reward_slips")
    .select("id, tradie_id, status")
    .eq("id", slipId)
    .single();

  if (!slip) return NextResponse.json({ error: "Slip not found" }, { status: 404 });
  if (slip.status !== "pending") {
    return NextResponse.json({ error: `Slip is already ${slip.status}, not pending` }, { status: 409 });
  }

  const { error } = await supabase
    .from("reward_slips")
    .update({ status: "rejected", rejected_reason: reason, approved_by: currentAdmin.id })
    .eq("id", slipId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const title = "Slip Rejected";
  await supabase.from("notifications").insert({
    user_id: slip.tradie_id,
    type: "reward_slip_rejected",
    title,
    body: reason,
    data: { slip_id: slipId },
    is_read: false,
  });
  await sendPush(slip.tradie_id, title, reason, { slip_id: slipId, type: "reward_slip_rejected" });

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "reward_slip.reject",
    targetTable: "reward_slips",
    targetId: slipId,
    details: { reason },
  });

  return NextResponse.json({ success: true });
}
