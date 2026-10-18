import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Public route — no admin session, authenticated by the access_token alone
// (see middleware.ts's allowlist). The critical check is that `lineId`
// actually belongs to the report `token` resolves to: without it, a
// supplier holding one valid token could mark ANY line on ANY report as
// loaded just by guessing a lineId.
export async function POST(req: Request) {
  const { token, lineId } = await req.json();
  if (!token || !lineId) return NextResponse.json({ error: "Missing token or lineId" }, { status: 400 });

  const { data: report } = await supabase
    .from("supplier_reports")
    .select("id, token_expires_at")
    .eq("access_token", token)
    .single();
  if (!report) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (new Date(report.token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const { data: line } = await supabase.from("supplier_report_lines").select("id, report_id, loaded_at").eq("id", lineId).single();
  if (!line || line.report_id !== report.id) {
    return NextResponse.json({ error: "This line does not belong to this report" }, { status: 403 });
  }
  if (line.loaded_at) return NextResponse.json({ success: true }); // already loaded — no-op

  const { error } = await supabase.from("supplier_report_lines").update({ loaded_at: new Date().toISOString() }).eq("id", lineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
