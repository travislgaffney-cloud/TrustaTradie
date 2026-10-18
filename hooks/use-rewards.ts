import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadPrivateFile, getSignedUrl } from '@/lib/storage';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useAuthStore } from '@/store/auth-store';
import type { Supplier, TradieSupplierAccount, RewardSlip } from '@/types/database';

// Bump when the consent copy shown in link-supplier.tsx changes — old
// consent rows keep whatever version they were given at the time, so a
// future wording change never retroactively claims old consent covered it.
export const REWARD_CONSENT_VERSION = '2026-10-v1';

export function useActiveSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setSuppliers((data as Supplier[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useRefreshOnFocus(fetchSuppliers);

  return { suppliers, loading, refresh: fetchSuppliers };
}

export function useTradieSupplierAccounts() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<TradieSupplierAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tradie_supplier_accounts')
      .select('*, supplier:suppliers(*)')
      .eq('tradie_id', user.id)
      .order('created_at', { ascending: false });
    setAccounts((data as TradieSupplierAccount[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchAccounts(); }, [user, fetchAccounts]);
  useRefreshOnFocus(() => { if (user) fetchAccounts(); });

  return { accounts, loading, refresh: fetchAccounts };
}

export async function linkSupplierAccount(params: {
  tradieId: string;
  supplierId: string;
  accountNumber: string;
}): Promise<void> {
  const { error } = await supabase.from('tradie_supplier_accounts').upsert(
    {
      tradie_id: params.tradieId,
      supplier_id: params.supplierId,
      account_number: params.accountNumber,
      consent_given_at: new Date().toISOString(),
      consent_version: REWARD_CONSENT_VERSION,
    },
    { onConflict: 'tradie_id,supplier_id' }
  );
  if (error) throw error;
}

export function useRewardSlips() {
  const { user } = useAuthStore();
  const [slips, setSlips] = useState<RewardSlip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlips = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('reward_slips')
      .select('*, supplier:suppliers(*)')
      .eq('tradie_id', user.id)
      .order('created_at', { ascending: false });
    setSlips((data as RewardSlip[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchSlips(); }, [user, fetchSlips]);
  useRefreshOnFocus(() => { if (user) fetchSlips(); });

  return { slips, loading, refresh: fetchSlips };
}

export interface SlipOcrResult {
  ocrAvailable: boolean;
  supplierName?: string | null;
  total?: number | null;
  date?: string | null;
  confidence?: number | null;
}

// Uploads to the private reward-slips bucket, then asks the OCR edge
// function to pre-fill fields from the image — OCR is best-effort and
// never blocks the upload itself (see reward-slip-ocr's own comments).
export async function uploadSlipImage(tradieId: string, localUri: string): Promise<{ path: string; ocr: SlipOcrResult }> {
  const ext = localUri.split('.').pop() ?? 'jpg';
  const path = `${tradieId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  await uploadPrivateFile('reward-slips', path, localUri, `image/${ext}`);

  try {
    const { data, error } = await supabase.functions.invoke('reward-slip-ocr', {
      body: { imagePath: path },
    });
    if (error || !data) return { path, ocr: { ocrAvailable: false } };
    return { path, ocr: data as SlipOcrResult };
  } catch {
    return { path, ocr: { ocrAvailable: false } };
  }
}

export async function getSlipImageUrl(path: string): Promise<string | null> {
  return getSignedUrl('reward-slips', path, 300);
}

// Phase 1: every slip lands at 'pending' — no auto-approval rules yet
// (those are Phase 2). slip_number/slip_date/total_amount are whatever the
// tradie confirmed, which may or may not match the OCR-extracted values;
// that comparison is also a Phase 2 concern.
export async function submitRewardSlip(params: {
  tradieId: string;
  supplierId: string;
  imagePath: string;
  slipNumber: string;
  slipDate: string;
  totalAmount: number;
  ocr: SlipOcrResult;
}): Promise<RewardSlip> {
  const { data, error } = await supabase
    .from('reward_slips')
    .insert({
      tradie_id: params.tradieId,
      supplier_id: params.supplierId,
      image_path: params.imagePath,
      slip_number: params.slipNumber,
      slip_date: params.slipDate,
      total_amount: params.totalAmount,
      ocr_supplier_name: params.ocr.supplierName ?? null,
      ocr_total: params.ocr.total ?? null,
      ocr_date: params.ocr.date ?? null,
      ocr_confidence: params.ocr.confidence ?? null,
      status: 'pending',
    })
    .select('*, supplier:suppliers(*)')
    .single();

  if (error) throw error;
  return data as RewardSlip;
}
