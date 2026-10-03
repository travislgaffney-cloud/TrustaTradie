import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { id, suspend } = await req.json();
  if (!id || suspend === undefined) {
    return NextResponse.json({ error: "Missing id or suspend" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: suspend })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminId: admin.id,
      action: suspend ? "user.suspend" : "user.unsuspend",
      targetTable: "profiles",
      targetId: id,
    });
  }

  return NextResponse.json({ success: true });
}
