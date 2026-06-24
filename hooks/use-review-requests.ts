import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';

interface ReviewRequest {
  id: string;
  job_id: string;
  tradie_id: string;
  customer_id: string;
  request_count: number;
  last_sent_at: string;
}

interface ReviewState {
  hasReview: boolean;
  request: ReviewRequest | null;
  canRequest: boolean;
}

export function useReviewState(jobId: string, customerId: string) {
  const { user } = useAuthStore();
  const [state, setState] = useState<ReviewState>({
    hasReview: false,
    request: null,
    canRequest: false,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !jobId) return;
    setLoading(true);

    const [{ data: rating }, { data: request }] = await Promise.all([
      supabase
        .from('ratings')
        .select('id')
        .eq('job_id', jobId)
        .eq('tradie_id', user.id)
        .maybeSingle(),
      supabase
        .from('review_requests')
        .select('*')
        .eq('job_id', jobId)
        .eq('tradie_id', user.id)
        .maybeSingle(),
    ]);

    const hasReview = !!rating;
    const req = request as ReviewRequest | null;
    const canRequest = !hasReview && (!req || req.request_count < 2);

    setState({ hasReview, request: req, canRequest });
    setLoading(false);
  }, [user, jobId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, loading, refresh: fetch };
}

export async function sendReviewRequest(params: {
  jobId: string;
  tradieId: string;
  customerId: string;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('review_requests')
    .select('*')
    .eq('job_id', params.jobId)
    .eq('tradie_id', params.tradieId)
    .maybeSingle();

  if (existing) {
    if (existing.request_count >= 2) {
      throw new Error('Maximum review requests reached');
    }
    await supabase
      .from('review_requests')
      .update({
        request_count: existing.request_count + 1,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('review_requests').insert({
      job_id: params.jobId,
      tradie_id: params.tradieId,
      customer_id: params.customerId,
      request_count: 1,
    });
  }

  const [{ data: tradie }, { data: job }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', params.tradieId).single(),
    supabase.from('jobs').select('title').eq('id', params.jobId).single(),
  ]);

  const body = `${tradie?.full_name ?? 'Your tradie'} would like you to leave a review for "${job?.title ?? 'a completed job'}"`;
  await supabase.from('notifications').insert({
    user_id: params.customerId,
    type: 'rating_received',
    title: 'Review Requested',
    body,
    data: { job_id: params.jobId, action: 'rate' },
    is_read: false,
  });
  sendPushToUser(params.customerId, 'Review Requested', body, { job_id: params.jobId });
}
