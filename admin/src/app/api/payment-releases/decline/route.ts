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

// Sets payment_release_requests.status = 'declined' with an optional note
// — no ledger change at all, so the job stays exactly where it was
// (pending_completion) and the tradie can submit a new request immediately
// (no cooldown — the plan's settled decision).
export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { requestId, note } = await req.json();
  if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

  const { data: request } = await supabase.from("payment_release_requests").select("id, job_id, tradie_id, status").eq("id", requestId).single();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: `This request is already ${request.status}, not pending` }, { status: 409 });
  }

  const { data: job } = await supabase.from("jobs").select("title").eq("id", request.job_id).single();

  const { error } = await supabase
    .from("payment_release_requests")
    .update({ status: "declined", reviewed_by: currentAdmin.id, reviewed_at: new Date().toISOString(), decision_note: note || null })
    .eq("id", requestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const title = "Release Request Declined";
  const body = note
    ? `Admin declined your payment release request for "${job?.title ?? "a job"}": ${note}`
    : `Admin declined your payment release request for "${job?.title ?? "a job"}".`;
  await supabase.from("notifications").insert({
    user_id: request.tradie_id,
    type: "payment_release_decision",
    title,
    body,
    data: { job_id: request.job_id },
    is_read: false,
  });
  await sendPush(request.tradie_id, title, body, { job_id: request.job_id, type: "payment_release_decision" });

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "payment_release.decline",
    targetTable: "payment_release_requests",
    targetId: requestId,
    details: { note },
  });

  return NextResponse.json({ success: true });
}
