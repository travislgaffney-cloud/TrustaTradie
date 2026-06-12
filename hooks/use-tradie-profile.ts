import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TradieDocument, PortfolioImage, Rating } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

export function useTradieDocuments() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<TradieDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch();
  }, [user]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('tradie_documents')
      .select('*')
      .eq('tradie_id', user!.id)
      .order('created_at', { ascending: false });
    setDocuments((data as TradieDocument[]) ?? []);
    setLoading(false);
  }

  return { documents, loading, refresh: fetch };
}

export function usePortfolioImages(tradieId?: string) {
  const { user } = useAuthStore();
  const id = tradieId ?? user?.id;
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch();
  }, [id]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('tradie_id', id!)
      .order('sort_order', { ascending: true });
    setImages((data as PortfolioImage[]) ?? []);
    setLoading(false);
  }

  return { images, loading, refresh: fetch };
}

export function useTradieRatings(tradieId: string) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch();
  }, [tradieId]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('ratings')
      .select('*, customer:profiles!ratings_customer_id_fkey(id, full_name, avatar_url)')
      .eq('tradie_id', tradieId)
      .order('created_at', { ascending: false });
    setRatings((data as Rating[]) ?? []);
    setLoading(false);
  }

  return { ratings, loading };
}
