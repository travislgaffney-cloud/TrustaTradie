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

  const { verificationId } = await req.json();
  if (!verificationId) return NextResponse.json({ error: "Missing verificationId" }, { status: 400 });

  const { data: verification } = await supabase
    .from("tradie_verifications")
    .select("id, tradie_id, status")
    .eq("id", verificationId)
    .single();

  if (!verification) return NextResponse.json({ error: "Verification attempt not found" }, { status: 404 });
  if (verification.status !== "appealed") {
    return NextResponse.json({ error: `This attempt is ${verification.status}, not awaiting appeal review` }, { status: 409 });
  }

  const { error } = await supabase
    .from("tradie_verifications")
    .update({
      status: "appeal_rejected",
      admin_decided_by: currentAdmin.id,
      admin_decided_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const title = "Verification appeal update";
  const body = "Our team reviewed your appeal and were not able to approve your Verified badge this time.";
  await supabase.from("notifications").insert({
    user_id: verification.tradie_id,
    type: "verification_appeal_rejected",
    title,
    body,
    data: { verification_id: verificationId },
    is_read: false,
  });
  await sendPush(verification.tradie_id, title, body, { verification_id: verificationId, type: "verification_appeal_rejected" });

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "verification_appeal.reject",
    targetTable: "tradie_verifications",
    targetId: verificationId,
  });

  return NextResponse.json({ success: true });
}
