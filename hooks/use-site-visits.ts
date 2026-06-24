import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';

export type SiteVisitStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled';

export interface SiteVisit {
  id: string;
  job_id: string;
  tradie_id: string;
  customer_id: string;
  proposed_datetime: string;
  status: SiteVisitStatus;
  created_at: string;
  updated_at: string;
  tradie?: { full_name: string; avatar_url: string | null };
  customer?: { full_name: string };
  job?: { title: string };
}

export function useSiteVisit(jobId: string, tradieId?: string) {
  const { user } = useAuthStore();
  const [visit, setVisit] = useState<SiteVisit | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVisit = useCallback(async () => {
    if (!jobId || !user) return;
    setLoading(true);

    let query = supabase
      .from('site_visits')
      .select('*, tradie:profiles!site_visits_tradie_id_fkey(full_name, avatar_url), job:jobs!site_visits_job_id_fkey(title)')
      .eq('job_id', jobId);

    if (tradieId) {
      query = query.eq('tradie_id', tradieId);
    } else {
      query = query.eq('tradie_id', user.id);
    }

    const { data } = await query.maybeSingle();
    setVisit(data as SiteVisit | null);
    setLoading(false);
  }, [jobId, tradieId, user]);

  useEffect(() => {
    fetchVisit();
  }, [fetchVisit]);

  return { visit, loading, refresh: fetchVisit };
}

export function useJobSiteVisits(jobId: string) {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const { data } = await supabase
      .from('site_visits')
      .select('*, tradie:profiles!site_visits_tradie_id_fkey(full_name, avatar_url)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    setVisits((data as SiteVisit[]) ?? []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return { visits, loading, refresh: fetchVisits };
}

export async function requestSiteVisit(params: {
  jobId: string;
  tradieId: string;
  customerId: string;
  proposedDatetime: string;
}): Promise<void> {
  const { error } = await supabase
    .from('site_visits')
    .upsert({
      job_id: params.jobId,
      tradie_id: params.tradieId,
      customer_id: params.customerId,
      proposed_datetime: params.proposedDatetime,
      status: 'proposed',
    }, { onConflict: 'job_id,tradie_id' });

  if (error) throw error;

  const { data: tradie } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', params.tradieId)
    .single();

  const { data: job } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', params.jobId)
    .single();

  const date = new Date(params.proposedDatetime).toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const body = `${tradie?.full_name ?? 'A tradie'} wants to view "${job?.title ?? 'your job'}" on ${date}`;
  await supabase.from('notifications').insert({
    user_id: params.customerId,
    type: 'new_quote_received',
    title: 'Site Visit Request',
    body,
    data: { job_id: params.jobId },
    is_read: false,
  });
  sendPushToUser(params.customerId, 'Site Visit Request', body, { job_id: params.jobId });
}

export async function respondToSiteVisit(params: {
  visitId: string;
  action: 'confirm' | 'suggest';
  newDatetime?: string;
}): Promise<void> {
  if (params.action === 'confirm') {
    await supabase
      .from('site_visits')
      .update({ status: 'confirmed' })
      .eq('id', params.visitId);

    const { data: visit } = await supabase
      .from('site_visits')
      .select('tradie_id, job_id, proposed_datetime, job:jobs!site_visits_job_id_fkey(title)')
      .eq('id', params.visitId)
      .single();

    if (visit) {
      const date = new Date((visit as any).proposed_datetime).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const body = `Your site visit for "${(visit as any).job?.title ?? 'a job'}" on ${date} has been confirmed`;
      await supabase.from('notifications').insert({
        user_id: (visit as any).tradie_id,
        type: 'quote_accepted',
        title: 'Visit Confirmed',
        body,
        data: { job_id: (visit as any).job_id },
        is_read: false,
      });
      sendPushToUser((visit as any).tradie_id, 'Visit Confirmed', body, { job_id: (visit as any).job_id });
    }
  } else if (params.action === 'suggest' && params.newDatetime) {
    await supabase
      .from('site_visits')
      .update({ proposed_datetime: params.newDatetime, status: 'proposed' })
      .eq('id', params.visitId);

    const { data: visit } = await supabase
      .from('site_visits')
      .select('tradie_id, job_id, job:jobs!site_visits_job_id_fkey(title), customer:profiles!site_visits_customer_id_fkey(full_name)')
      .eq('id', params.visitId)
      .single();

    if (visit) {
      const date = new Date(params.newDatetime).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const body = `${(visit as any).customer?.full_name ?? 'The customer'} suggested a new time for viewing "${(visit as any).job?.title ?? 'a job'}": ${date}`;
      await supabase.from('notifications').insert({
        user_id: (visit as any).tradie_id,
        type: 'new_quote_received',
        title: 'New Time Suggested',
        body,
        data: { job_id: (visit as any).job_id },
        is_read: false,
      });
      sendPushToUser((visit as any).tradie_id, 'New Time Suggested', body, { job_id: (visit as any).job_id });
    }
  }
}

export async function markSiteVisitComplete(visitId: string): Promise<void> {
  const { error } = await supabase
    .from('site_visits')
    .update({ status: 'completed' })
    .eq('id', visitId);

  if (error) throw error;
}
