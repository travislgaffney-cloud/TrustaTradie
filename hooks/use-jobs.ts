import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyUser } from '@/lib/notifications';
import { uploadFile } from '@/lib/storage';
import { getTransactionByJobId, markCompletedByProvider } from '@/hooks/use-transactions';
import { extractFunctionErrorMessage } from '@/lib/edge-function-error';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { Job, TransactionStatus } from '@/types/database';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useAuthStore } from '@/store/auth-store';

export async function uploadCompletionPhoto(jobId: string, tradieId: string, localUri: string): Promise<string> {
  const path = `${tradieId}/${jobId}/${Date.now()}.jpg`;
  const url = await uploadFile('completion-photos', path, localUri, 'image/jpeg');
  const { error } = await supabase.from('jobs').update({ completion_photo_url: url }).eq('id', jobId);
  if (error) throw error;
  return url;
}

// Jobs only carry a `status` field (open/accepted/in_progress/...) — whether
// the customer has actually paid lives on the transaction, not the job, so
// job.status alone can't tell "Quote Accepted" (unpaid) apart from "Quote
// Accepted" (paid, tradie just hasn't started yet). Attaching the
// transaction's status lets the UI show a distinct "Paid" state in that gap.
async function attachPaymentStatuses(jobs: Job[]): Promise<Job[]> {
  if (jobs.length === 0) return jobs;
  const { data: txns } = await supabase
    .from('transactions')
    .select('job_id, status')
    .in('job_id', jobs.map((j) => j.id));

  const statusByJobId = new Map<string, TransactionStatus>(
    (txns ?? []).map((t: { job_id: string; status: TransactionStatus }) => [t.job_id, t.status])
  );
  return jobs.map((j) => ({ ...j, payment_status: statusByJobId.get(j.id) ?? null }));
}

export function useMyJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  useRefreshOnFocus(() => { if (user) fetchJobs(); });

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, images:job_images(*)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false });
    setJobs(await attachPaymentStatuses((data as Job[]) ?? []));
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

  useRefreshOnFocus(fetchJob);

  async function fetchJob() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, images:job_images(*), customer:profiles!jobs_customer_id_fkey(*)')
      .eq('id', jobId)
      .single<Job>();
    const [withPayment] = data ? await attachPaymentStatuses([data]) : [null];
    setJob(withPayment ?? null);
    setLoading(false);
  }

  return { job, loading, refresh: fetchJob };
}

// Town-based matching — the replacement for useNearbyJobs while geolocation
// is parked. A tradie sees open jobs whose town is in their own service_towns
// list; no distance math, just an exact (normalized) string match.
export function useTownJobs(serviceTowns: string[], category?: TradeCategory) {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotedJobIds, setQuotedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchByTown();
  }, [serviceTowns.join('|'), category]);

  useRefreshOnFocus(fetchByTown);

  async function fetchByTown() {
    if (serviceTowns.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .in('town', serviceTowns)
      .order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);

    const [{ data: jobData, error }, { data: quoteData }] = await Promise.all([
      query,
      user
        ? supabase.from('quotes').select('job_id').eq('tradie_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);
    if (error) { console.error('[useTownJobs] error:', error.message); setJobs([]); setLoading(false); return; }
    setJobs((jobData as Job[]) ?? []);
    setQuotedJobIds(new Set((quoteData ?? []).map((q: { job_id: string }) => q.job_id)));
    setLoading(false);
  }

  return { jobs, quotedJobIds, loading, refresh: fetchByTown };
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

  useRefreshOnFocus(fetchNearby);

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
  town: string;
  lat?: number;
  lng?: number;
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
      town: params.town,
      // location is left null while geolocation is parked — nothing reads
      // it going forward, but the column stays for when it's re-enabled.
      location: params.lat != null && params.lng != null ? `POINT(${params.lng} ${params.lat})` : null,
      budget_min: params.budgetMin ?? null,
      budget_max: params.budgetMax ?? null,
      preferred_start: params.preferredStart ?? null,
      status: 'open',
    })
    .select()
    .single<Job>();

  if (error) throw error;

  // Alert every tradie who services this job's town and trade — the two
  // filters that actually drive job discovery now that geolocation is
  // parked (see useTownJobs). Best-effort: a failure here shouldn't block
  // the job post itself since the job was already created successfully.
  try {
    const { data: matchingTradies } = await supabase
      .from('tradie_profiles')
      .select('id')
      .contains('categories', [params.category])
      .contains('service_towns', [params.town]);

    if (matchingTradies && matchingTradies.length > 0) {
      const categoryLabel = TRADE_CATEGORIES.find((c) => c.value === params.category)?.label ?? params.category;
      const body = `New ${categoryLabel} job in ${params.town}: "${params.title}"`;
      await Promise.all(
        matchingTradies.map((t) =>
          notifyUser({
            userId: t.id,
            type: 'new_job_nearby',
            title: 'New Job Near You',
            body,
            data: { job_id: data.id },
          })
        )
      );
    }
  } catch (notifyError) {
    console.error('[createJob] tradie notification fan-out failed:', notifyError);
  }

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
      .filter((j: any) => j && ['accepted', 'in_progress', 'pending_completion', 'completed'].includes(j.status))
      .sort((a: Job, b: Job) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setJobs(jobList as Job[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, fetchJobs]);

  useRefreshOnFocus(fetchJobs);

  return { jobs, loading, refresh: fetchJobs };
}

// Jobs where this tradie has an open conversation with the customer (started
// via "Message Customer" on a job listing) but hasn't submitted a quote yet
// — the "pending quotes" worklist: leads worth following up on.
export function useUnquotedLeads() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: convos, error }, { data: quoted }] = await Promise.all([
      supabase
        .from('conversations')
        .select('job:jobs(*, images:job_images(*))')
        .eq('tradie_id', user.id)
        .not('job_id', 'is', null)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      supabase.from('quotes').select('job_id').eq('tradie_id', user.id),
    ]);
    if (error) { console.error('[useUnquotedLeads] error:', error.message); setJobs([]); setLoading(false); return; }

    const quotedJobIds = new Set((quoted ?? []).map((q: { job_id: string }) => q.job_id));
    const leads = (convos ?? [])
      .map((c: any) => c.job)
      .filter((j: any) => j && !quotedJobIds.has(j.id));

    setJobs(leads as Job[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user, fetchLeads]);

  useRefreshOnFocus(fetchLeads);

  return { jobs, loading, refresh: fetchLeads };
}

export async function startJob(jobId: string, tradieId: string, scheduledAt: Date): Promise<void> {
  // Tells TradeSafe the allocation's delivery has begun (CREATED -> INITIATED).
  // Without this, allocationCompleteDelivery later rejects with "You cannot
  // complete delivery for this allocation" — funding the transaction never
  // by itself advances the allocation's own state.
  const txn = await getTransactionByJobId(jobId);
  if (txn?.tradesafe_allocation_id) {
    const { data, error: tsError } = await supabase.functions.invoke('tradesafe-allocation-action', {
      body: { jobId, action: 'start' },
    });
    if (tsError || data?.error) {
      throw new Error(await extractFunctionErrorMessage(tsError, data?.error ?? 'Could not start the job with TradeSafe'));
    }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress', scheduled_at: scheduledAt.toISOString() })
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

    const date = scheduledAt.toLocaleDateString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    const body = `${tradie?.full_name ?? 'Your tradie'} has booked ${date} to start work on "${job.title}"`;
    await notifyUser({
      userId: job.customer_id,
      type: 'job_started',
      title: 'Job Start Booked',
      body,
      data: { job_id: jobId },
    });
  }
}

export async function completeJob(jobId: string, tradieId: string): Promise<void> {
  const txnBefore = await getTransactionByJobId(jobId);

  // The ledger only allows funds_held -> completed_by_provider — if the
  // customer's payment never actually settled (still sitting at 'accepted'),
  // there's nothing to mark delivered yet. Check this up front, before
  // touching jobs.status, so a rejection here can't leave the job stuck at
  // 'pending_completion' while the transaction never moved off 'accepted'.
  if (!txnBefore || txnBefore.status !== 'funds_held') {
    throw new Error("Payment hasn't been confirmed as held in escrow yet, so this job can't be marked complete.");
  }

  if (txnBefore.tradesafe_allocation_id) {
    const { data, error: tsError } = await supabase.functions.invoke('tradesafe-allocation-action', {
      body: { jobId, action: 'complete' },
    });
    if (tsError || data?.error) {
      throw new Error(await extractFunctionErrorMessage(tsError, data?.error ?? 'Could not mark the job delivered with TradeSafe'));
    }
  }

  await markCompletedByProvider(txnBefore.id);

  // completion_marked_at, not updated_at, is what the 72-hour payment
  // release window reads — set once, here, so an unrelated row update can
  // never accidentally shift the clock.
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'pending_completion', completion_marked_at: new Date().toISOString() })
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
    await notifyUser({
      userId: job.customer_id,
      type: 'job_completed',
      title: 'Job Completed',
      body,
      data: { job_id: jobId },
    });
  }
}
