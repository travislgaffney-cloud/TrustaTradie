import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

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
  return NextResponse.json({ success: true });
}
