import { useCallback, useEffect, useState } from 'react';
import { extractFunctionErrorMessage } from '@/lib/edge-function-error';
import { supabase } from '@/lib/supabase';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { TradieVerification } from '@/types/database';

export function useTradieVerification(tradieId: string | undefined) {
  const [verification, setVerification] = useState<TradieVerification | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!tradieId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('tradie_verifications')
      .select('*')
      .eq('tradie_id', tradieId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setVerification((data as TradieVerification) ?? null);
    setLoading(false);
  }, [tradieId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRefreshOnFocus(fetch);

  return { verification, loading, refresh: fetch };
}

export async function startVerificationCheckout(
  idNumber: string,
  cipcNumber?: string
): Promise<{ verificationId: string; redirectUrl?: string }> {
  const { data, error } = await supabase.functions.invoke('ozow-checkout', {
    body: { idNumber, cipcNumber },
  });
  if (error || data?.error) {
    throw new Error(await extractFunctionErrorMessage(error, data?.error ?? 'Could not start verification payment'));
  }
  return data;
}

export async function submitVerificationAppeal(verificationId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('tradie_verifications')
    .update({
      status: 'appealed',
      appeal_note: note,
      appeal_submitted_at: new Date().toISOString(),
    })
    .eq('id', verificationId);
  if (error) throw new Error(error.message);
}
