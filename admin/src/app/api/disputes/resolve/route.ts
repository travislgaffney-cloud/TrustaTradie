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
  const { jobId, note, action } = await req.json();
  if (!jobId || !note) {
    return NextResponse.json({ error: "Missing jobId or note" }, { status: 400 });
  }

  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }
  const adminId = currentAdmin.id;

  // Insert dispute note
  const { data: noteData, error: noteError } = await supabase
    .from("dispute_notes")
    .insert({
      job_id: jobId,
      admin_id: adminId,
      note,
      action_taken: action ?? "note_only",
    })
    .select("*, admin:profiles!dispute_notes_admin_id_fkey(full_name)")
    .single();

  if (noteError) {
    return NextResponse.json({ error: noteError.message }, { status: 500 });
  }

  // Update job status based on action
  const jobStatusMap: Record<string, string> = {
    reverted_to_in_progress: "in_progress",
    marked_completed: "completed",
    marked_cancelled: "cancelled",
  };

  // Mirrors the internal transaction ledger's ALLOWED_TRANSITIONS from
  // hooks/use-transactions.ts — 'disputed' can legally move to any of these.
  const transactionStatusMap: Record<string, string> = {
    reverted_to_in_progress: "funds_held",
    marked_completed: "released",
    marked_cancelled: "cancelled",
  };

  const resolutionCopy: Record<string, { customer: string; tradie: string }> = {
    reverted_to_in_progress: {
      customer: "The dispute has been reviewed and the job is back in progress. Funds remain held in escrow.",
      tradie: "The dispute has been reviewed and the job is back in progress. Funds remain held in escrow.",
    },
    marked_completed: {
      customer: "The dispute has been resolved in favour of the tradie — the job is marked complete and payment has been released.",
      tradie: "The dispute has been resolved in your favour — the job is marked complete and payment has been released.",
    },
    marked_cancelled: {
      customer: "The dispute has been resolved by cancelling the job. Your payment will be refunded.",
      tradie: "The dispute has been resolved by cancelling the job.",
    },
  };

  if (action && jobStatusMap[action]) {
    await supabase.from("jobs").update({ status: jobStatusMap[action] }).eq("id", jobId);

    const { data: txn } = await supabase
      .from("transactions")
      .select("id, customer_id, tradie_id, status")
      .eq("job_id", jobId)
      .single();

    if (txn) {
      // TODO: this updates our internal ledger only. It does not yet call
      // TradeSafe's own release/amendment API to move real funds — that
      // needs wiring separately before this is safe to use with real money.
      await supabase
        .from("transactions")
        .update({ status: transactionStatusMap[action] })
        .eq("id", txn.id);

      const copy = resolutionCopy[action];
      const notifyRows = [
        { user_id: txn.customer_id, title: "Dispute Resolved", body: copy.customer },
        { user_id: txn.tradie_id, title: "Dispute Resolved", body: copy.tradie },
      ].map((n) => ({
        user_id: n.user_id,
        type: "job_completed",
        title: n.title,
        body: n.body,
        data: { job_id: jobId },
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifyRows);
      await Promise.all(
        notifyRows.map((n) => sendPush(n.user_id, n.title, n.body, { job_id: jobId, type: n.type }))
      );
    }
  }

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "dispute.resolve",
    targetTable: "jobs",
    targetId: jobId,
    details: { action: action ?? "note_only", note },
  });

  return NextResponse.json({ success: true, note: noteData });
}
