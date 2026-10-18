import { supabase } from "@/lib/supabase";
import { PaymentReleaseList } from "./payment-release-list";

export const dynamic = "force-dynamic";

async function getPendingReleaseRequests() {
  const { data } = await supabase
    .from("payment_release_requests")
    .select(`
      id, requested_at,
      job:jobs!payment_release_requests_job_id_fkey(id, title, status, completion_marked_at, customer:profiles!jobs_customer_id_fkey(full_name)),
      tradie:profiles!payment_release_requests_tradie_id_fkey(full_name)
    `)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  // Display-only filter — a job that moved to disputed or completed after
  // the request was created just stops appearing here. The actual
  // enforcement happens at the moment of action (see /api/payment-releases),
  // which re-reads job.status itself rather than trusting this list.
  return (data ?? [])
    .map((r: any) => ({
      id: r.id,
      requestedAt: r.requested_at,
      jobId: r.job?.id,
      jobTitle: r.job?.title ?? "Unknown job",
      jobStatus: r.job?.status,
      completionMarkedAt: r.job?.completion_marked_at,
      customerName: (Array.isArray(r.job?.customer) ? r.job.customer[0] : r.job?.customer)?.full_name ?? "Unknown customer",
      tradieName: (Array.isArray(r.tradie) ? r.tradie[0] : r.tradie)?.full_name ?? "Unknown tradie",
    }))
    .filter((r) => r.jobStatus === "pending_completion");
}

export default async function PaymentReleasesPage() {
  const requests = await getPendingReleaseRequests();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Payment Release Requests</h1>
      <p className="text-sm text-gray-500 mb-6">
        Jobs where the customer hasn&apos;t confirmed completion or raised a dispute within the review window, and the tradie has asked for payment to be released.
      </p>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-lg">No pending requests</p>
        </div>
      ) : (
        <PaymentReleaseList requests={requests} />
      )}
    </div>
  );
}
