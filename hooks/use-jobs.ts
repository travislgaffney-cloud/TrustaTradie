import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearby();
  }, [lat, lng, radiusKm, category]);

  async function fetchNearby() {
    setLoading(true);
    const { data } = await supabase.rpc('get_nearby_jobs', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_category: category ?? null,
    });
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }

  return { jobs, loading, refresh: fetchNearby };
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
