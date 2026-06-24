import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, resolved } = await req.json();
  if (!id || resolved === undefined) {
    return NextResponse.json({ error: "Missing id or resolved" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bug_reports")
    .update({ resolved })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
