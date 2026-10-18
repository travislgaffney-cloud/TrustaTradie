import { supabase } from '@/lib/supabase';
import { notifyUser } from '@/lib/notifications';
import { getPaymentReleaseHours } from '@/hooks/use-platform-settings';
import type { PaymentReleaseRequest } from '@/types/database';

export interface ReleaseEligibility {
  eligible: boolean;
  availableAt: Date;
}

// Pure given its inputs — the 72-hour (or admin-configured) window is read
// from completion_marked_at, never updated_at, so an unrelated row update
// can't shift it.
export function getReleaseEligibility(completionMarkedAt: string, releaseHours: number, now: Date = new Date()): ReleaseEligibility {
  const availableAt = new Date(new Date(completionMarkedAt).getTime() + releaseHours * 60 * 60 * 1000);
  return { eligible: now >= availableAt, availableAt };
}

export async function getActiveReleaseRequest(jobId: string): Promise<PaymentReleaseRequest | null> {
  const { data } = await supabase
    .from('payment_release_requests')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<PaymentReleaseRequest>();
  return data ?? null;
}

// Notifies every real admin (the `admins` table — not profiles.role, which
// the existing dispute-raise flow uses and which this plan deliberately
// doesn't repeat) that a release request needs review.
async function notifyAdmins(jobId: string, jobTitle: string): Promise<void> {
  const { data: admins } = await supabase.from('admins').select('user_id');
  const body = `A tradie has requested payment release for "${jobTitle}" — the customer hasn't confirmed or disputed within the review window.`;
  await Promise.all(
    (admins ?? []).map((a) =>
      notifyUser({
        userId: a.user_id,
        type: 'payment_release_requested',
        title: 'Payment Release Requested',
        body,
        data: { job_id: jobId },
      })
    )
  );
}

export async function requestPaymentRelease(jobId: string, tradieId: string, jobTitle: string): Promise<void> {
  const { error } = await supabase.from('payment_release_requests').insert({ job_id: jobId, tradie_id: tradieId });

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('A release request is already pending for this job.');
    }
    throw error;
  }

  await notifyAdmins(jobId, jobTitle);
}

export { getPaymentReleaseHours };
