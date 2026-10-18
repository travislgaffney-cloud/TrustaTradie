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

// Admin-configurable window a job must sit at pending_completion with no
// customer confirmation or dispute before a tradie can request an admin
// payment release. Falls back to 72h on any read failure.
export async function getPaymentReleaseHours(): Promise<number> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('payment_release_hours')
    .eq('id', true)
    .single<{ payment_release_hours: number }>();

  if (error || !data) return 72;
  return Number(data.payment_release_hours);
}
