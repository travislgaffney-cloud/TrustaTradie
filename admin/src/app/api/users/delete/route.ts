import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

// Mirrors supabase/functions/delete-account: a hard DELETE on profiles fails
// outright for any user with real activity — payments, transactions,
// conversations, messages, ratings, pending_payouts, and booking_proposals
// all reference profiles with a blocking (NO ACTION) foreign key, not
// CASCADE, and that failure was previously silent (no error surfaced here).
// Same reasons as the mobile self-service flow: anonymize + permanently
// lock the login, but keep jobs/quotes/transactions/payments/invoices/
// ratings/messages intact — those are the other party's records too, and
// tax law requires retaining financial records regardless of an admin
// deletion action.
const FOLDERED_PII_BUCKETS = ["documents", "portfolio", "completion-photos"] as const;

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // 1. Remove PII-bearing storage files
  for (const bucket of FOLDERED_PII_BUCKETS) {
    const { data: files } = await supabase.storage.from(bucket).list(id);
    if (files && files.length > 0) {
      await supabase.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
    }
  }
  // avatars are flat filenames (`{userId}.{ext}`), not foldered
  const { data: avatarFiles } = await supabase.storage.from("avatars").list("", { search: id });
  if (avatarFiles && avatarFiles.length > 0) {
    await supabase.storage.from("avatars").remove(avatarFiles.map((f) => f.name));
  }

  // 2. Delete rows that are purely personal (not needed for the other party's record)
  await supabase.from("tradie_documents").delete().eq("tradie_id", id);
  await supabase.from("portfolio_images").delete().eq("tradie_id", id);

  // 3. Anonymize the profile — kept (not deleted) so historical jobs/transactions
  //    the other party relies on still resolve to a valid (now-anonymous) profile.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: "Deleted User",
      avatar_url: null,
      phone: null,
      bio: null,
      location: null,
      address_text: null,
      suburb: null,
      province: null,
      push_token: null,
      bank_name: null,
      bank_account_number: null,
      bank_branch_code: null,
      bank_account_type: null,
      is_suspended: true,
    })
    .eq("id", id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // 4. Strip tradie-specific business/identifying fields
  await supabase.from("tradie_profiles").update({
    cipc_number: null,
    vat_number: null,
    hourly_rate: null,
  }).eq("id", id);

  // 5. Permanently lock the login: scrub the identity used to sign in, ban indefinitely
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    email: `deleted-${id}@trustatradie.invalid`,
    user_metadata: {},
    ban_duration: "876000h", // ~100 years — Supabase has no literal "permanent"
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Only attributable while signed in through the new per-admin auth —
  // legacy shared-password sessions have no real identity to log against.
  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({ adminId: admin.id, action: "user.delete", targetTable: "profiles", targetId: id });
  }

  return NextResponse.json({ success: true });
}
