import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("commission_pct, updated_at")
    .eq("id", true)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { commissionPct } = await req.json();

  if (typeof commissionPct !== "number" || commissionPct < 0 || commissionPct > 1) {
    return NextResponse.json({ error: "commissionPct must be a number between 0 and 1" }, { status: 400 });
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({ commission_pct: commissionPct, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminId: admin.id,
      action: "settings.update",
      targetTable: "platform_settings",
      targetId: "true",
      details: { commissionPct },
    });
  }

  return NextResponse.json({ success: true });
}
