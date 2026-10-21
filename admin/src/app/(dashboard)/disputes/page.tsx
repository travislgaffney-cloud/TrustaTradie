import { supabase } from "@/lib/supabase";
import { DisputeList } from "./dispute-list";

export const dynamic = "force-dynamic";

async function getDisputedJobs() {
  const { data } = await supabase
    .from("jobs")
    .select(`
      *,
      customer:profiles!jobs_customer_id_fkey(id, full_name, phone),
      quotes!inner(
        tradie_id,
        amount,
        status,
        tradie:profiles!quotes_tradie_id_fkey(id, full_name, phone)
      )
    `)
    .eq("status", "disputed")
    .eq("quotes.status", "accepted")
    .order("updated_at", { ascending: false });

  return data ?? [];
}

async function getDisputeNotes() {
  const { data } = await supabase
    .from("dispute_notes")
    .select("*, admin:profiles!dispute_notes_admin_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

async function getDisputeReports() {
  const { data } = await supabase
    .from("dispute_reports")
    .select("*")
    .order("created_at", { ascending: false });

  // dispute-evidence is a private bucket — signed here, server-side, same
  // pattern as the documents and reward-slips review pages.
  const reports = data ?? [];
  return Promise.all(
    reports.map(async (r) => {
      const photoUrls = await Promise.all(
        (r.photo_paths as string[]).map(async (path) => {
          const { data: signed } = await supabase.storage.from("dispute-evidence").createSignedUrl(path, 600);
          return signed?.signedUrl ?? null;
        })
      );
      return { ...r, photoUrls: photoUrls.filter((u): u is string => u !== null) };
    })
  );
}

export default async function DisputesPage() {
  const [jobs, notes, reports] = await Promise.all([getDisputedJobs(), getDisputeNotes(), getDisputeReports()]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Disputes & Refunds</h1>
      <p className="text-sm text-gray-500 mb-6">
        Review and resolve disputed jobs
      </p>

      {jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">⚖️</p>
          <p className="text-lg">No active disputes</p>
          <p className="text-sm mt-1">All clear — no jobs are currently in a disputed state.</p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-800 font-medium mb-6 inline-block">
          ⚖️ {jobs.length} active dispute{jobs.length !== 1 ? "s" : ""} requiring attention
        </div>
      )}

      <DisputeList jobs={jobs} notes={notes} reports={reports} />
    </div>
  );
}
