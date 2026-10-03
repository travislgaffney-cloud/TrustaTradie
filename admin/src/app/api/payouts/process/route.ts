import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { id, bankReference } = await req.json();
  if (!id || !bankReference) {
    return NextResponse.json({ error: "Missing id or bankReference" }, { status: 400 });
  }

  const { error } = await supabase
    .from("pending_payouts")
    .update({
      status: "processed",
      bank_reference: bankReference,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminId: admin.id,
      action: "payout.process",
      targetTable: "pending_payouts",
      targetId: id,
      details: { bankReference },
    });
  }

  return NextResponse.json({ success: true });
}
