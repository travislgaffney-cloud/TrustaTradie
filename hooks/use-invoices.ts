import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import type { Invoice } from '@/types/database';

export function useInvoice(paymentId: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();
    setInvoice(data as Invoice | null);
    setLoading(false);
  }, [paymentId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { invoice, loading, refresh: fetch };
}

async function generateInvoiceNumber(): Promise<string> {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `INV-${date}-${rand}`;
}

export async function generateInvoice(params: {
  paymentId: string;
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
      payment_id: params.paymentId,
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
  await supabase.from('notifications').insert({
    user_id: params.customerId,
    type: 'payment_released',
    title: 'Invoice Available',
    body,
    data: { payment_id: params.paymentId },
    is_read: false,
  });
  sendPushToUser(params.customerId, 'Invoice Available', body);

  return data;
}

export async function uploadInvoice(params: {
  paymentId: string;
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
      payment_id: params.paymentId,
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
  await supabase.from('notifications').insert({
    user_id: params.customerId,
    type: 'payment_released',
    title: 'Invoice Available',
    body,
    data: { payment_id: params.paymentId },
    is_read: false,
  });
  sendPushToUser(params.customerId, 'Invoice Available', body);

  return data;
}
