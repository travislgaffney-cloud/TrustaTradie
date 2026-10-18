import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/audit";

// Soft delete only, per the plan doc — no hard delete endpoint exists for
// suppliers. A deactivated supplier disappears from the active list tradies
// link against (suppliers_authenticated_read + is_active filtering happens
// client-side) but its historical slips and linked accounts are untouched.
export async function POST(req: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "No admin session found" }, { status: 401 });
  }

  const { id, isActive } = await req.json();
  if (!id || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Missing id or isActive" }, { status: 400 });
  }

  const { error } = await supabase.from("suppliers").update({ is_active: isActive }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: currentAdmin.id,
    action: isActive ? "supplier.reactivate" : "supplier.deactivate",
    targetTable: "suppliers",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
