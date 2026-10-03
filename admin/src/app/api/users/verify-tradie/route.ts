import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("tradie_profiles")
    .update({ is_verified: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({ adminId: admin.id, action: "tradie.verify", targetTable: "tradie_profiles", targetId: id });
  }

  return NextResponse.json({ success: true });
}
