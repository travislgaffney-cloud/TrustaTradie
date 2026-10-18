import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { lineId } = await req.json();
  if (!lineId) return NextResponse.json({ error: "Missing lineId" }, { status: 400 });

  const { data: line } = await supabase.from("supplier_report_lines").select("id, loaded_at").eq("id", lineId).single();
  if (!line) return NextResponse.json({ error: "Report line not found" }, { status: 404 });
  if (line.loaded_at) return NextResponse.json({ success: true }); // already loaded — no-op

  const { error } = await supabase.from("supplier_report_lines").update({ loaded_at: new Date().toISOString() }).eq("id", lineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: currentAdmin.id,
    action: "reward_report_line.mark_loaded",
    targetTable: "supplier_report_lines",
    targetId: lineId,
  });

  return NextResponse.json({ success: true });
}
