import { supabase } from '@/lib/supabase';
import { getCommissionPct } from '@/hooks/use-platform-settings';
import type { Transaction, TransactionStatus, TransactionStatusHistoryEntry } from '@/types/database';

// Legal status transitions for the internal ledger. This is dummy/test data —
// no real payment provider is involved yet — so this is the only place
// enforcing the lifecycle, not a DB-level constraint.
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  quoted: ['accepted', 'cancelled'],
  accepted: ['funds_held', 'cancelled'],
  funds_held: ['completed_by_provider', 'disputed', 'cancelled'],
  // 'released' here is the admin-initiated 72-hour release path — it skips
  // confirmed_by_customer entirely because the customer never actually
  // confirmed; claiming otherwise would misrepresent
  // transaction_status_history. The customer's own release button still
  // goes through confirmed_by_customer as it does today.
  completed_by_provider: ['confirmed_by_customer', 'disputed', 'released'],
  confirmed_by_customer: ['released', 'disputed'],
  released: [],
  disputed: ['funds_held', 'released', 'cancelled'],
  cancelled: [],
};

async function transition(transactionId: string, next: TransactionStatus): Promise<Transaction> {
  const { data: current, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single<Transaction>();

  if (fetchError) throw fetchError;
  if (!current) throw new Error(`Transaction ${transactionId} not found`);

  // Idempotent no-op: a caller retrying after a partial failure (e.g. this
  // transition landed but a subsequent external call, like the TradeSafe
  // mutation, threw) would otherwise hit "illegal transition: X -> X" on
  // every retry forever, since X is never in its own allowed-next list —
  // permanently stuck with no way back. Already being at `next` is success.
  if (current.status === next) return current;

  if (!ALLOWED_TRANSITIONS[current.status].includes(next)) {
    throw new Error(`Illegal transaction transition: ${current.status} -> ${next}`);
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: next })
    .eq('id', transactionId)
    .select()
    .single<Transaction>();

  if (error) throw error;
  return data;
}

export async function createTransaction(params: {
  jobId: string;
  quoteId: string;
  customerId: string;
  tradieId: string;
  quotedAmount: number;
}): Promise<Transaction> {
  const commissionPct = await getCommissionPct();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      job_id: params.jobId,
      quote_id: params.quoteId,
      customer_id: params.customerId,
      tradie_id: params.tradieId,
      quoted_amount: params.quotedAmount,
      commission_pct: commissionPct,
      status: 'accepted',
    })
    .select()
    .single<Transaction>();

  if (error) throw error;
  return data;
}

export async function getTransactionByJobId(jobId: string): Promise<Transaction | null> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle<Transaction>();
  return data ?? null;
}

// Self-healing: if acceptQuote() ever completes the quote/job status update
// but fails before creating the transaction row (network blip, etc.), the
// quote's "accept" CTA is gone for good — nothing else can retry it. The
// pay screen calls this instead of getTransactionByJobId() directly so it
// recovers on its own rather than dead-ending on a blank screen.
export async function ensureTransactionForJob(jobId: string): Promise<Transaction> {
  const existing = await getTransactionByJobId(jobId);
  if (existing) return existing;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('customer_id, accepted_quote_id')
    .eq('id', jobId)
    .single();
  if (jobError) throw jobError;
  if (!job?.accepted_quote_id) throw new Error('This job has no accepted quote yet.');

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('tradie_id, amount')
    .eq('id', job.accepted_quote_id)
    .single();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error('Could not find the accepted quote.');

  return createTransaction({
    jobId,
    quoteId: job.accepted_quote_id,
    customerId: job.customer_id,
    tradieId: quote.tradie_id,
    quotedAmount: quote.amount,
  });
}

export async function getTransactionStatusHistory(transactionId: string): Promise<TransactionStatusHistoryEntry[]> {
  const { data } = await supabase
    .from('transaction_status_history')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('changed_at', { ascending: true });
  return (data as TransactionStatusHistoryEntry[]) ?? [];
}

export interface TradieReportRow {
  transactionId: string;
  invoiceNumber: string | null;
  releasedDate: string;
  jobTitle: string | null;
  jobCategory: string | null;
  customerName: string | null;
  grossAmount: number;
  commissionAmount: number;
  payout: number;
  invoiceVatAmount: number | null;
}

// Tradie's own SARS-facing report: their taxable revenue per transaction is the
// payout they actually receive (gross minus TrustaTradie's commission).
export async function getTradieReport(
  tradieId: string,
  startIso: string,
  endIso: string
): Promise<TradieReportRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, quoted_amount, commission_pct, updated_at,
      job:jobs!transactions_job_id_fkey(title, category),
      customer:profiles!transactions_customer_id_fkey(full_name),
      invoice:invoices!invoices_transaction_id_fkey(invoice_number, vat_amount)
    `)
    .eq('tradie_id', tradieId)
    .eq('status', 'released')
    .gte('updated_at', startIso)
    .lte('updated_at', endIso)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((t: any) => {
    const grossAmount = Number(t.quoted_amount);
    const commissionAmount = grossAmount * Number(t.commission_pct);
    const invoice = Array.isArray(t.invoice) ? t.invoice[0] : t.invoice;
    return {
      transactionId: t.id,
      invoiceNumber: invoice?.invoice_number ?? null,
      releasedDate: t.updated_at,
      jobTitle: t.job?.title ?? null,
      jobCategory: t.job?.category ?? null,
      customerName: t.customer?.full_name ?? null,
      grossAmount,
      commissionAmount,
      payout: grossAmount - commissionAmount,
      invoiceVatAmount: invoice?.vat_amount ?? null,
    };
  });
}

export const markFundsHeld = (transactionId: string) => transition(transactionId, 'funds_held');
export const markCompletedByProvider = (transactionId: string) => transition(transactionId, 'completed_by_provider');
export const markConfirmedByCustomer = (transactionId: string) => transition(transactionId, 'confirmed_by_customer');
export const releaseFunds = (transactionId: string) => transition(transactionId, 'released');
export const raiseTransactionDispute = (transactionId: string) => transition(transactionId, 'disputed');
export const cancelTransaction = (transactionId: string) => transition(transactionId, 'cancelled');
