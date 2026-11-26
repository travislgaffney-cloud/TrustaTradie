import { supabase } from "@/lib/supabase";
import { AppealList } from "./appeal-list";

export const dynamic = "force-dynamic";

async function getAppeals() {
  const { data } = await supabase
    .from("tradie_verifications")
    .select(`
      id, tradie_id, id_number, status, amount,
      id_check_passed, id_check_result,
      cipc_check_passed, cipc_check_result,
      bank_check_passed, bank_check_result,
      appeal_note, appeal_submitted_at, created_at,
      tradie:profiles!tradie_verifications_tradie_id_fkey(full_name, phone, avatar_url)
    `)
    .eq("status", "appealed")
    .order("appeal_submitted_at", { ascending: true });

  // Postgrest returns a to-one embed as either a plain object or a
  // single-element array depending on how it infers the relationship
  // cardinality from this untyped query — normalized here once.
  return (data ?? []).map((row: any) => ({
    ...row,
    tradie: Array.isArray(row.tradie) ? (row.tradie[0] ?? null) : row.tradie,
  }));
}

export default async function VerificationAppealsPage() {
  const appeals = await getAppeals();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Verification Appeals</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tradies whose automated ID/CIPC/bank checks failed, appealing for a manual review
      </p>

      {appeals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">✓</p>
          <p className="text-lg">No appeals pending</p>
          <p className="text-sm mt-1">All clear — nothing waiting on a manual review.</p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 font-medium mb-6 inline-block">
          🕐 {appeals.length} appeal{appeals.length !== 1 ? "s" : ""} pending review
        </div>
      )}

      <AppealList appeals={appeals} />
    </div>
  );
}
