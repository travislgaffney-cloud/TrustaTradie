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

// Reuses the existing release mechanism (the same best-effort TradeSafe
// accept call, then the ledger transition, then job.status='completed')
// rather than building a new one — just triggered by an admin instead of
// the customer, and skipping confirmed_by_customer since the customer
// never actually confirmed. Everything here is re-read fresh rather than
// trusted from the request body or the queue list, mirroring the same
// defensive pattern completeJob() already uses for its own funds_held
// check — a request that looked eligible when the admin's queue loaded but
// was disputed moments before this call is rejected, not silently honoured.
export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { requestId } = await req.json();
  if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

  const { data: request } = await supabase.from("payment_release_requests").select("id, job_id, tradie_id, status").eq("id", requestId).single();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: `This request is already ${request.status}, not pending` }, { status: 409 });
  }

  const { data: job } = await supabase.from("jobs").select("id, title, status").eq("id", request.job_id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "pending_completion") {
    return NextResponse.json({ error: "This job is no longer awaiting completion confirmation — it may have been disputed." }, { status: 409 });
  }

  const { data: txn } = await supabase
    .from("transactions")
    .select("id, status, quoted_amount, commission_pct, tradesafe_allocation_id")
    .eq("job_id", job.id)
    .single();
  if (!txn) return NextResponse.json({ error: "No transaction found for this job" }, { status: 404 });
  if (txn.status !== "completed_by_provider") {
    return NextResponse.json({ error: `Transaction is at ${txn.status}, not completed_by_provider — cannot release` }, { status: 409 });
  }

  if (txn.tradesafe_allocation_id) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tradesafe-allocation-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ jobId: job.id, action: "accept" }),
      });
      if (!res.ok) {
        console.warn("[payment-releases/release] TradeSafe accept call rejected (expected — server-side credentials can't finalize as the buyer), continuing:", await res.text());
      }
    } catch (tsErr) {
      console.warn("[payment-releases/release] TradeSafe accept call failed, continuing with local release:", tsErr);
    }
  }

  const releasedAt = new Date().toISOString();

  const { error: txnError } = await supabase
    .from("transactions")
    .update({ status: "released", released_by_admin_id: currentAdmin.id, released_by_admin_at: releasedAt })
    .eq("id", txn.id);
  if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 });

  await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id);
  await supabase
    .from("payment_release_requests")
    .update({ status: "released", reviewed_by: currentAdmin.id, reviewed_at: releasedAt })
    .eq("id", requestId);

  const payout = Number(txn.quoted_amount) - Number(txn.quoted_amount) * Number(txn.commission_pct);
  const title = "Payment Released";
  const body = `Admin reviewed and released payment for "${job.title}" — R${payout.toFixed(2)} on its way.`;
  await supabase.from("notifications").insert({
    user_id: request.tradie_id,
    type: "payment_release_decision",
    title,
    body,
    data: { job_id: job.id },
    is_read: false,
  });
  await sendPush(request.tradie_id, title, body, { job_id: job.id, type: "payment_release_decision" });

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "payment_release.release",
    targetTable: "payment_release_requests",
    targetId: requestId,
    details: { jobId: job.id, transactionId: txn.id },
  });

  return NextResponse.json({ success: true });
}
