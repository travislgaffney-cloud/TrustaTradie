import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { id, responded } = await req.json();
  if (!id || responded === undefined) {
    return NextResponse.json({ error: "Missing id or responded" }, { status: 400 });
  }

  const { error } = await supabase
    .from("contact_messages")
    .update({ responded })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminId: admin.id,
      action: responded ? "contact_message.respond" : "contact_message.reopen",
      targetTable: "contact_messages",
      targetId: id,
    });
  }

  return NextResponse.json({ success: true });
}
