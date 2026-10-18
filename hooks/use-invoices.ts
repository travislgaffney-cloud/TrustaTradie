import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyUser } from '@/lib/notifications';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { Invoice } from '@/types/database';

export function useInvoice(transactionId: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle();
    setInvoice(data as Invoice | null);
    setLoading(false);
  }, [transactionId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRefreshOnFocus(fetch);

  return { invoice, loading, refresh: fetch };
}

async function generateInvoiceNumber(): Promise<string> {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `INV-${date}-${rand}`;
}

export async function generateInvoice(params: {
  transactionId: string;
  jobId: string;
  tradieId: string;
  customerId: string;
  amount: number;
  includesVat: boolean;
  jobTitle: string;
  tradieMessage?: string;
}): Promise<Invoice> {
  const invoiceNumber = await generateInvoiceNumber();
  const vatAmount = params.includesVat ? params.amount * 0.15 / 1.15 : 0;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      transaction_id: params.transactionId,
      job_id: params.jobId,
      tradie_id: params.tradieId,
      customer_id: params.customerId,
      invoice_number: invoiceNumber,
      type: 'generated',
      amount: params.amount,
      vat_amount: Math.round(vatAmount * 100) / 100,
      description: params.jobTitle,
    })
    .select()
    .single<Invoice>();

  if (error) throw error;

  // Notify customer
  const body = `Invoice ${invoiceNumber} for "${params.jobTitle}" is ready to view`;
  await notifyUser({
    userId: params.customerId,
    type: 'payment_released',
    title: 'Invoice Available',
    body,
    data: { job_id: params.jobId },
  });

  return data;
}

export async function uploadInvoice(params: {
  transactionId: string;
  jobId: string;
  tradieId: string;
  customerId: string;
  amount: number;
  uploadedUrl: string;
  jobTitle: string;
}): Promise<Invoice> {
  const invoiceNumber = await generateInvoiceNumber();

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      transaction_id: params.transactionId,
      job_id: params.jobId,
      tradie_id: params.tradieId,
      customer_id: params.customerId,
      invoice_number: invoiceNumber,
      type: 'uploaded',
      amount: params.amount,
      uploaded_url: params.uploadedUrl,
      description: params.jobTitle,
    })
    .select()
    .single<Invoice>();

  if (error) throw error;

  const body = `Invoice ${invoiceNumber} for "${params.jobTitle}" is ready to view`;
  await notifyUser({
    userId: params.customerId,
    type: 'payment_released',
    title: 'Invoice Available',
    body,
    data: { job_id: params.jobId },
  });

  return data;
}
