import { supabase } from '@/lib/supabase';
import { PLATFORM_FEE } from '@/constants/config';

// Reads the live commission take-rate set from the admin dashboard.
// Falls back to the PLATFORM_FEE constant if the row can't be reached,
// so a network hiccup never blocks a quote/payment screen from rendering.
export async function getCommissionPct(): Promise<number> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('commission_pct')
    .eq('id', true)
    .single<{ commission_pct: number }>();

  if (error || !data) return PLATFORM_FEE;
  return Number(data.commission_pct);
}
