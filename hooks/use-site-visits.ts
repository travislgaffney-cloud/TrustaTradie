import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyUser } from '@/lib/notifications';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useAuthStore } from '@/store/auth-store';
import type { Job } from '@/types/database';

export type SiteVisitStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled';
export type ProposedBy = 'tradie' | 'customer';

export interface SiteVisit {
  id: string;
  job_id: string;
  tradie_id: string;
  customer_id: string;
  proposed_datetime: string;
  status: SiteVisitStatus;
  proposed_by: ProposedBy;
  created_at: string;
  updated_at: string;
  tradie?: { full_name: string; avatar_url: string | null };
  customer?: { full_name: string };
  job?: Job;
}

export function useSiteVisit(jobId: string, tradieId?: string) {
  const { user } = useAuthStore();
  const [visit, setVisit] = useState<SiteVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2, 7)).current;

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
    if (!jobId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`site_visit:${jobId}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_visits', filter: `job_id=eq.${jobId}` }, () => fetchVisit())
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchVisit, jobId]);

  useRefreshOnFocus(fetchVisit);

  return { visit, loading, refresh: fetchVisit };
}

// All upcoming (proposed/confirmed) site visits for the logged-in tradie,
// across every job — used to surface "booked but not yet quoted" jobs.
export function useMySiteVisits() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('site_visits')
      .select('*, job:jobs!site_visits_job_id_fkey(*)')
      .eq('tradie_id', user.id)
      .in('status', ['proposed', 'confirmed'])
      .order('proposed_datetime', { ascending: true });
    setVisits((data as SiteVisit[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchVisits();
  }, [user, fetchVisits]);

  useRefreshOnFocus(fetchVisits);

  return { visits, loading, refresh: fetchVisits };
}

export function useJobSiteVisits(jobId: string) {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2, 7)).current;

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
    if (!jobId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`job_site_visits:${jobId}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_visits', filter: `job_id=eq.${jobId}` }, () => fetchVisits())
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchVisits, jobId]);

  useRefreshOnFocus(fetchVisits);

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
      proposed_by: 'tradie',
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
  await notifyUser({
    userId: params.customerId,
    type: 'site_visit_requested',
    title: 'Site Visit Request',
    body,
    data: { job_id: params.jobId },
  });
}

export async function respondToSiteVisit(params: {
  visitId: string;
  action: 'confirm' | 'suggest';
  respondedBy: ProposedBy;
  newDatetime?: string;
}): Promise<void> {
  if (params.action === 'confirm') {
    await supabase
      .from('site_visits')
      .update({ status: 'confirmed' })
      .eq('id', params.visitId);

    const { data: visit } = await supabase
      .from('site_visits')
      .select('tradie_id, customer_id, job_id, proposed_datetime, job:jobs!site_visits_job_id_fkey(title)')
      .eq('id', params.visitId)
      .single();

    if (visit) {
      const date = new Date((visit as any).proposed_datetime).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const body = `Your site visit for "${(visit as any).job?.title ?? 'a job'}" on ${date} has been confirmed`;
      // Notify whichever party did NOT just confirm
      const notifyUserId = params.respondedBy === 'tradie' ? (visit as any).customer_id : (visit as any).tradie_id;
      await notifyUser({
        userId: notifyUserId,
        type: 'quote_accepted',
        title: 'Visit Confirmed',
        body,
        data: { job_id: (visit as any).job_id },
      });
    }
  } else if (params.action === 'suggest' && params.newDatetime) {
    await supabase
      .from('site_visits')
      .update({ proposed_datetime: params.newDatetime, status: 'proposed', proposed_by: params.respondedBy })
      .eq('id', params.visitId);

    const { data: visit } = await supabase
      .from('site_visits')
      .select('tradie_id, customer_id, job_id, job:jobs!site_visits_job_id_fkey(title), customer:profiles!site_visits_customer_id_fkey(full_name), tradie:profiles!site_visits_tradie_id_fkey(full_name)')
      .eq('id', params.visitId)
      .single();

    if (visit) {
      const date = new Date(params.newDatetime).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const proposerName = params.respondedBy === 'customer'
        ? ((visit as any).customer?.full_name ?? 'The customer')
        : ((visit as any).tradie?.full_name ?? 'The tradie');
      const notifyUserId = params.respondedBy === 'customer' ? (visit as any).tradie_id : (visit as any).customer_id;
      const body = `${proposerName} suggested a new time for viewing "${(visit as any).job?.title ?? 'a job'}": ${date}`;
      await notifyUser({
        userId: notifyUserId,
        type: 'site_visit_requested',
        title: 'New Time Suggested',
        body,
        data: { job_id: (visit as any).job_id },
      });
    }
  }
}

export async function markSiteVisitComplete(visitId: string): Promise<void> {
  const { error } = await supabase
    .from('site_visits')
    .update({ status: 'completed' })
    .eq('id', visitId);

  if (error) throw error;

  const { data: visit } = await supabase
    .from('site_visits')
    .select('customer_id, job_id, job:jobs!site_visits_job_id_fkey(title)')
    .eq('id', visitId)
    .single();

  if (visit) {
    const body = `The tradie has viewed "${(visit as any).job?.title ?? 'your job'}". You can expect a quote soon.`;
    await notifyUser({
      userId: (visit as any).customer_id,
      type: 'site_visit_completed',
      title: 'Site Visit Complete',
      body,
      data: { job_id: (visit as any).job_id },
    });
  }
}
