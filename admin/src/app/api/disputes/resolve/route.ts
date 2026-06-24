import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { jobId, note, action } = await req.json();
  if (!jobId || !note) {
    return NextResponse.json({ error: "Missing jobId or note" }, { status: 400 });
  }

  // Get the first admin user to attribute the note to
  const { data: admin } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin")
    .limit(1)
    .single();

  const adminId = admin?.id;
  if (!adminId) {
    return NextResponse.json({ error: "No admin user found" }, { status: 400 });
  }

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
  const statusMap: Record<string, string> = {
    reverted_to_in_progress: "in_progress",
    marked_completed: "completed",
    marked_cancelled: "cancelled",
  };

  if (action && statusMap[action]) {
    await supabase
      .from("jobs")
      .update({ status: statusMap[action] })
      .eq("id", jobId);

    // If cancelling, refund the payment
    if (action === "marked_cancelled") {
      await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("job_id", jobId)
        .in("status", ["held_in_escrow"]);
    }
  }

  return NextResponse.json({ success: true, note: noteData });
}
