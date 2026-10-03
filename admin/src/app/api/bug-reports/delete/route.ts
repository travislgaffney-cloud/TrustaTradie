import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase.from("bug_reports").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({ adminId: admin.id, action: "bug_report.delete", targetTable: "bug_reports", targetId: id });
  }

  return NextResponse.json({ success: true });
}
