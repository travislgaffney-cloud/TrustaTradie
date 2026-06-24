import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify the document
  const { data: doc, error } = await supabase
    .from("tradie_documents")
    .update({ is_verified: true })
    .eq("id", id)
    .select("tradie_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all documents for this tradie are now verified
  const tradieId = doc.tradie_id;
  const { count: unverifiedCount } = await supabase
    .from("tradie_documents")
    .select("*", { count: "exact", head: true })
    .eq("tradie_id", tradieId)
    .eq("is_verified", false);

  if (unverifiedCount === 0) {
    // All documents verified — mark the tradie profile as verified
    const { data: existing } = await supabase
      .from("tradie_profiles")
      .select("is_verified")
      .eq("id", tradieId)
      .single();

    if (existing && !existing.is_verified) {
      await supabase
        .from("tradie_profiles")
        .update({ is_verified: true })
        .eq("id", tradieId);

      // Notify the tradie
      await supabase.from("notifications").insert({
        user_id: tradieId,
        type: "rating_received",
        title: "You're Verified! ✓",
        body: "All your documents have been verified. Your profile now shows a verified badge — customers can see you're a trusted tradie.",
        data: {},
        is_read: false,
      });

      // Send push notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("push_token")
        .eq("id", tradieId)
        .single();

      if (profile?.push_token) {
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: profile.push_token,
              title: "You're Verified! ✓",
              body: "All your documents have been verified. Your profile now shows a verified badge.",
              sound: "default",
              priority: "high",
            }),
          });
        } catch {
          // Push failed silently
        }
      }
    }
  }

  return NextResponse.json({ success: true, allVerified: unverifiedCount === 0 });
}
