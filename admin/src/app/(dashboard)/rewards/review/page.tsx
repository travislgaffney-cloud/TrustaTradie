import { supabase } from "@/lib/supabase";
import { ReviewList } from "./review-list";

export const dynamic = "force-dynamic";

async function getPendingSlips() {
  const { data } = await supabase
    .from("reward_slips")
    .select(`
      *,
      tradie:profiles!reward_slips_tradie_id_fkey(full_name, phone),
      supplier:suppliers(name, reward_pct, min_slip_amount)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const slips = data ?? [];

  // Signed URLs generated here, server-side, with the service-role client —
  // the review queue is the only place an admin ever sees the slip image,
  // and never via a public/long-lived URL (see the plan doc's Security section).
  const withUrls = await Promise.all(
    slips.map(async (slip) => {
      const { data: signed } = await supabase.storage
        .from("reward-slips")
        .createSignedUrl(slip.image_path, 300);
      return { ...slip, imageUrl: signed?.signedUrl ?? null };
    })
  );

  return withUrls;
}

export default async function ReviewQueuePage() {
  const slips = await getPendingSlips();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Review Queue</h1>
      <p className="text-sm text-gray-500 mb-6">
        Till slips that didn&apos;t auto-approve — over the threshold, or flagged by a check
      </p>

      {slips.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🧾</p>
          <p className="text-lg">Nothing to review</p>
          <p className="text-sm mt-1">All submitted slips have been auto-approved or already actioned.</p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 font-medium mb-6 inline-block">
          🧾 {slips.length} slip{slips.length !== 1 ? "s" : ""} awaiting review
        </div>
      )}

      <ReviewList slips={slips} />
    </div>
  );
}
