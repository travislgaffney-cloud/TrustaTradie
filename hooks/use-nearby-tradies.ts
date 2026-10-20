import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { TradeCategory } from '@/constants/trade-categories';

export interface NearbyTradie {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  suburb: string | null;
  categories: TradeCategory[];
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  is_verified: boolean;
  hourly_rate: number | null;
  distance_km: number;
}

export function useNearbyTradies(
  lat: number,
  lng: number,
  radiusKm = 50,
  category?: TradeCategory
) {
  const [tradies, setTradies] = useState<NearbyTradie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTradies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_nearby_tradies', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_category: category ?? null,
    });
    setTradies((data as NearbyTradie[]) ?? []);
    setLoading(false);
  }, [lat, lng, radiusKm, category]);

  useEffect(() => {
    fetchTradies();
  }, [fetchTradies]);

  useRefreshOnFocus(fetchTradies);

  return { tradies, loading, refresh: fetchTradies };
}

export interface TownTradie {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  suburb: string | null;
  categories: TradeCategory[];
  average_rating: number;
  total_reviews: number;
  completed_jobs: number;
  is_verified: boolean;
  gold_verified: boolean;
  hourly_rate: number | null;
}

// Town-based replacement for useNearbyTradies while geolocation is parked.
// tradie_profiles is the base table here (not profiles) because the filter
// — service_towns contains this town — lives on tradie_profiles; embedding
// profiles from there is the FK-owner direction, which resolves cleanly.
export function useTradiesByTown(town: string | null, category?: TradeCategory) {
  const [tradies, setTradies] = useState<TownTradie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTradies = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tradie_profiles')
      .select('id, categories, average_rating, total_reviews, completed_jobs, is_verified, gold_verified, hourly_rate, profile:profiles!tradie_profiles_id_fkey(full_name, avatar_url, bio, suburb)')
      .order('average_rating', { ascending: false });
    if (town) query = query.contains('service_towns', [town]);
    if (category) query = query.contains('categories', [category]);

    const { data, error } = await query;
    if (error) {
      console.error('[useTradiesByTown] error:', error.message);
      setTradies([]);
      setLoading(false);
      return;
    }

    const flattened = (data ?? []).map((row: any) => ({
      id: row.id,
      full_name: row.profile?.full_name ?? '',
      avatar_url: row.profile?.avatar_url ?? null,
      bio: row.profile?.bio ?? null,
      suburb: row.profile?.suburb ?? null,
      categories: row.categories ?? [],
      average_rating: row.average_rating ?? 0,
      total_reviews: row.total_reviews ?? 0,
      completed_jobs: row.completed_jobs ?? 0,
      is_verified: row.is_verified ?? false,
      gold_verified: row.gold_verified ?? false,
      hourly_rate: row.hourly_rate ?? null,
    }));
    setTradies(flattened);
    setLoading(false);
  }, [town, category]);

  useEffect(() => {
    fetchTradies();
  }, [fetchTradies]);

  useRefreshOnFocus(fetchTradies);

  return { tradies, loading, refresh: fetchTradies };
}
