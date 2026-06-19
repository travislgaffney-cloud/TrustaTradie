import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

export function useJobQuotes(jobId: string) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Unique suffix prevents channel name collision when multiple screens call this with same jobId
  const instanceId = useRef(Math.random().toString(36).slice(2, 7)).current;

  useEffect(() => {
    if (!jobId) return;
    fetchQuotes();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`quotes:job:${jobId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes', filter: `job_id=eq.${jobId}` }, () => fetchQuotes())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `job_id=eq.${jobId}` }, () => fetchQuotes())
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [jobId]);

  async function fetchQuotes() {
    setLoading(true);
    // tradie_profiles has no direct FK from quotes — nest it inside profiles join instead
    const { data, error } = await supabase
      .from('quotes')
      .select('*, tradie:profiles!quotes_tradie_id_fkey(*, tradie_profiles(*))')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (error) console.error('[useJobQuotes] fetch error:', error.message, error.details);
    // Hoist nested tradie_profiles to top-level tradie_profile so QuoteCard works unchanged
    const mapped = (data ?? []).map((q: any) => ({
      ...q,
      tradie_profile: q.tradie?.tradie_profiles ?? null,
    }));
    setQuotes(mapped as Quote[]);
    setLoading(false);
  }

  return { quotes, loading, refresh: fetchQuotes };
}

export function useMyQuotes() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2, 7)).current;

  useEffect(() => {
    if (!userId) return;
    fetchQuotes();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`quotes:tradie:${userId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes', filter: `tradie_id=eq.${userId}` }, () => fetchQuotes())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `tradie_id=eq.${userId}` }, () => fetchQuotes())
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]); // stable string — won't re-run on object reference changes

  async function fetchQuotes() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*, job:jobs(*)')
      .eq('tradie_id', user.id)
      .order('created_at', { ascending: false });
    setQuotes((data as Quote[]) ?? []);
    setLoading(false);
  }

  return { quotes, loading, refresh: fetchQuotes };
}

export async function submitQuote(params: {
  jobId: string;
  tradieId: string;
  amount: number;
  includesVat: boolean;
  message: string;
  timelineDays: number;
  quoteDocumentUrl?: string;
}): Promise<Quote> {
  // Upsert conversation so both parties have a chat channel
  const { data: job } = await supabase
    .from('jobs')
    .select('customer_id')
    .eq('id', params.jobId)
    .single();

  if (job) {
    await supabase.from('conversations').upsert({
      job_id: params.jobId,
      customer_id: job.customer_id,
      tradie_id: params.tradieId,
    }, { onConflict: 'job_id,customer_id,tradie_id' });
  }

  const { data, error } = await supabase
    .from('quotes')
    .upsert({
      job_id: params.jobId,
      tradie_id: params.tradieId,
      amount: params.amount,
      includes_vat: params.includesVat,
      message: params.message,
      timeline_days: params.timelineDays,
      quote_document_url: params.quoteDocumentUrl ?? null,
      status: 'pending',
    }, { onConflict: 'job_id,tradie_id', ignoreDuplicates: false })
    .select()
    .single<Quote>();

  if (error) throw error;
  if (!data) throw new Error('Quote upsert returned no data');

  // Notify the customer that a quote has arrived
  if (job) {
    const [{ data: jobDetail }, { data: tradieProfile }] = await Promise.all([
      supabase.from('jobs').select('title').eq('id', params.jobId).single(),
      supabase.from('profiles').select('full_name').eq('id', params.tradieId).single(),
    ]);

    await supabase.from('notifications').insert({
      user_id: job.customer_id,
      type: 'new_quote_received',
      title: 'New Quote Received',
      body: `${tradieProfile?.full_name ?? 'A tradie'} submitted a quote for "${jobDetail?.title ?? 'your job'}" — R${params.amount.toLocaleString()}`,
      data: { job_id: params.jobId, quote_id: data.id },
      is_read: false,
    });
  }

  return data;
}

export async function acceptQuote(quoteId: string, jobId: string): Promise<void> {
  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId);

  await supabase
    .from('jobs')
    .update({ status: 'accepted', accepted_quote_id: quoteId })
    .eq('id', jobId);

  // Reject all other pending quotes for this job
  await supabase
    .from('quotes')
    .update({ status: 'rejected' })
    .eq('job_id', jobId)
    .neq('id', quoteId)
    .eq('status', 'pending');
}
