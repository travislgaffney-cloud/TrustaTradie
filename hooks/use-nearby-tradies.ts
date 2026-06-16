import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc('get_nearby_tradies', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_category: category ?? null,
      })
      .then(({ data }) => {
        setTradies((data as NearbyTradie[]) ?? []);
        setLoading(false);
      });
  }, [lat, lng, radiusKm, category]);

  return { tradies, loading };
}
