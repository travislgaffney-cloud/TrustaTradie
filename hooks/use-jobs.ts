import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import type { Job } from '@/types/database';
import type { TradeCategory } from '@/constants/trade-categories';
import { useAuthStore } from '@/store/auth-store';

export function useMyJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, images:job_images(*)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false });
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }

  return { jobs, loading, refresh: fetchJobs };
}

export function useJob(jobId: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  async function fetchJob() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, images:job_images(*), customer:profiles!jobs_customer_id_fkey(*)')
      .eq('id', jobId)
      .single<Job>();
    setJob(data ?? null);
    setLoading(false);
  }

  return { job, loading, refresh: fetchJob };
}

export function useNearbyJobs(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: TradeCategory
) {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotedJobIds, setQuotedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearby();
  }, [lat, lng, radiusKm, category]);

  async function fetchNearby() {
    setLoading(true);
    const [{ data: jobData }, { data: quoteData }] = await Promise.all([
      supabase.rpc('get_nearby_jobs', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_category: category ?? null,
      }),
      user
        ? supabase.from('quotes').select('job_id').eq('tradie_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);
    setJobs((jobData as Job[]) ?? []);
    setQuotedJobIds(new Set((quoteData ?? []).map((q: { job_id: string }) => q.job_id)));
    setLoading(false);
  }

  return { jobs, quotedJobIds, loading, refresh: fetchNearby };
}

export async function createJob(params: {
  customerId: string;
  title: string;
  description: string;
  category: TradeCategory;
  addressText: string;
  suburb: string;
  province: string;
  lat: number;
  lng: number;
  budgetMin?: number;
  budgetMax?: number;
  preferredStart?: string;
}): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      customer_id: params.customerId,
      title: params.title,
      description: params.description,
      category: params.category,
      address_text: params.addressText,
      suburb: params.suburb,
      province: params.province,
      location: `POINT(${params.lng} ${params.lat})`,
      budget_min: params.budgetMin ?? null,
      budget_max: params.budgetMax ?? null,
      preferred_start: params.preferredStart ?? null,
      status: 'open',
    })
    .select()
    .single<Job>();

  if (error) throw error;
  return data;
}

export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw error;
}

export function useMyTradieJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: tradieJobs } = await supabase
      .from('quotes')
      .select('job:jobs!quotes_job_id_fkey(*, images:job_images(*))')
      .eq('tradie_id', user.id)
      .eq('status', 'accepted');

    const jobList = (tradieJobs ?? [])
      .map((q: any) => q.job)
      .filter((j: any) => j && ['accepted', 'in_progress', 'pending_completion', 'completed'].includes(j.status));

    setJobs(jobList as Job[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, fetchJobs]);

  return { jobs, loading, refresh: fetchJobs };
}

export async function startJob(jobId: string, tradieId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', jobId);

  if (error) throw error;

  const { data: job } = await supabase
    .from('jobs')
    .select('title, customer_id')
    .eq('id', jobId)
    .single();

  if (job) {
    const { data: tradie } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', tradieId)
      .single();

    const body = `${tradie?.full_name ?? 'Your tradie'} has started work on "${job.title}"`;
    await supabase.from('notifications').insert({
      user_id: job.customer_id,
      type: 'job_started',
      title: 'Job Started',
      body,
      data: { job_id: jobId },
      is_read: false,
    });
    sendPushToUser(job.customer_id, 'Job Started', body, { job_id: jobId });
  }
}

export async function completeJob(jobId: string, tradieId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'pending_completion' })
    .eq('id', jobId);

  if (error) throw error;

  const { data: job } = await supabase
    .from('jobs')
    .select('title, customer_id')
    .eq('id', jobId)
    .single();

  if (job) {
    const { data: tradie } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', tradieId)
      .single();

    const body = `${tradie?.full_name ?? 'Your tradie'} has marked "${job.title}" as complete. Please review and release payment.`;
    await supabase.from('notifications').insert({
      user_id: job.customer_id,
      type: 'job_completed',
      title: 'Job Completed',
      body,
      data: { job_id: jobId },
      is_read: false,
    });
    sendPushToUser(job.customer_id, 'Job Completed', body, { job_id: jobId });
  }
}
