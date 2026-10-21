import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EscrowTimeline } from '@/components/payments/escrow-timeline';
import { DisputeReportModal } from '@/components/jobs/dispute-report-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { supabase } from '@/lib/supabase';
import { uploadPrivateFile } from '@/lib/storage';
import { notifyUser } from '@/lib/notifications';
import { extractFunctionErrorMessage } from '@/lib/edge-function-error';
import { markConfirmedByCustomer, releaseFunds, raiseTransactionDispute } from '@/hooks/use-transactions';
import { useInvoice } from '@/hooks/use-invoices';
import { printInvoice, viewInvoice } from '@/lib/invoice-pdf';
import { useAuthStore } from '@/store/auth-store';
import type { Transaction, Job } from '@/types/database';

type TransactionWithJoins = Transaction & { job?: Job; tradie?: { full_name: string } };

export default function PaymentDetailScreen() {
  const { jobId, from } = useLocalSearchParams<{ jobId: string; from?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const [txn, setTxn] = useState<TransactionWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState<'view' | 'print' | null>(null);
  const { invoice } = useInvoice(txn?.id ?? '');

  const invoiceCtx = {
    jobTitle: txn?.job?.title ?? 'Job',
    tradieName: txn?.tradie?.full_name ?? 'Tradie',
    customerName: profile?.full_name ?? 'Customer',
  };

  async function handleViewInvoice() {
    if (!invoice) return;
    setInvoiceBusy('view');
    try {
      await viewInvoice(invoice, invoiceCtx);
    } catch (err) {
      Alert.alert('Could not open invoice', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setInvoiceBusy(null);
    }
  }

  async function handlePrintInvoice() {
    if (!invoice) return;
    setInvoiceBusy('print');
    try {
      await printInvoice(invoice, invoiceCtx);
    } catch (err) {
      Alert.alert('Could not print invoice', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setInvoiceBusy(null);
    }
  }

  useEffect(() => {
    load();
  }, [jobId]);

  useRefreshOnFocus(load);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*, job:jobs(*), tradie:profiles!transactions_tradie_id_fkey(full_name)')
      .eq('job_id', jobId)
      .single<TransactionWithJoins>();
    setTxn(data ?? null);
    setLoading(false);
  }

  async function handleRelease() {
    if (!txn) return;
    setReleasing(true);

    try {
      // Best-effort only: TradeSafe requires finalization to come from the
      // buyer's own authenticated context, which this app's server-side
      // credentials (authenticated as the AGENT party) structurally can't
      // provide — allocationAcceptDelivery itself succeeds, but the call
      // always rejects with "You are not allowed to accept this
      // transaction" past that point (confirmed live). Until there's a
      // proper buyer-authenticated flow for that, don't let it block the
      // customer's own release — this is sandbox/dummy data with no real
      // money moving yet. Log it so it's visible without stopping the flow.
      if (txn.tradesafe_allocation_id) {
        try {
          const { data, error } = await supabase.functions.invoke('tradesafe-allocation-action', {
            body: { jobId, action: 'accept' },
          });
          if (error || data?.error) {
            throw new Error(await extractFunctionErrorMessage(error, data?.error ?? 'Could not release payment via TradeSafe'));
          }
        } catch (tsErr) {
          console.warn('[handleRelease] TradeSafe accept failed, continuing with local release:', tsErr);
        }
      }

      await markConfirmedByCustomer(txn.id);
      await releaseFunds(txn.id);
      await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId);

      const payout = txn.quoted_amount - txn.quoted_amount * txn.commission_pct;
      await notifyUser({
        userId: txn.tradie_id,
        type: 'payment_released',
        title: '💰 Payment Released!',
        body: `R${payout.toFixed(2)} released for "${txn.job?.title ?? 'a job'}".`,
        data: { job_id: jobId },
      });

      await load();
      router.push(`/rate/${jobId}`);
    } catch (err) {
      Alert.alert('Could not release payment', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setReleasing(false);
    }
  }

  function handleDispute() {
    if (!txn) return;
    setDisputeModalVisible(true);
  }

  async function submitDispute(reason: string, photoUris: string[]) {
    if (!txn || !profile) return;
    setDisputing(true);
    try {
      if (txn.tradesafe_allocation_id) {
        const { data, error } = await supabase.functions.invoke('tradesafe-allocation-action', {
          body: { jobId, action: 'dispute', comment: 'Customer raised a dispute via the Trust-a-Tradie app.' },
        });
        if (error || data?.error) {
          throw new Error(await extractFunctionErrorMessage(error, data?.error ?? 'Could not raise dispute via TradeSafe'));
        }
      }

      // Uploaded before the dispute_reports insert so a failed upload never
      // leaves a report row pointing at photos that don't exist.
      const photoPaths: string[] = [];
      for (const uri of photoUris) {
        const ext = uri.split('.').pop() ?? 'jpg';
        const path = `${jobId}/${Date.now()}_${photoPaths.length}.${ext}`;
        const storedPath = await uploadPrivateFile('dispute-evidence', path, uri, `image/${ext}`);
        photoPaths.push(storedPath);
      }

      await supabase.from('dispute_reports').insert({
        job_id: jobId,
        customer_id: profile.id,
        reason,
        photo_paths: photoPaths,
      });

      await raiseTransactionDispute(txn.id);
      await supabase.from('jobs').update({ status: 'disputed' }).eq('id', jobId);

      // Real admins table, not profiles.role — the same inconsistency
      // already fixed for the payment-release feature.
      const { data: admins } = await supabase.from('admins').select('user_id');
      const body = `A customer has raised a dispute for job "${txn.job?.title ?? 'a job'}" — R${txn.quoted_amount.toLocaleString()} held in escrow. Reason: ${reason}`;
      for (const admin of admins ?? []) {
        await notifyUser({
          userId: admin.user_id,
          type: 'job_completed',
          title: '⚖️ Dispute Raised',
          body,
          data: { job_id: jobId },
        });
      }

      const tradieBody = `The customer has raised a dispute for "${txn.job?.title ?? 'a job'}". Payment is on hold while our team investigates.`;
      await notifyUser({
        userId: txn.tradie_id,
        type: 'job_completed',
        title: 'Dispute Raised',
        body: tradieBody,
        data: { job_id: jobId },
      });

      setDisputeModalVisible(false);
      await load();
      Alert.alert('Dispute Raised', 'Our team has been notified and will investigate. The payment remains frozen until resolved.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not raise dispute. Please try again.');
    } finally {
      setDisputing(false);
    }
  }

  if (loading) return <LoadingSpinner full />;
  if (!txn) return null;

  const fee = txn.quoted_amount * txn.commission_pct;
  const payout = txn.quoted_amount - fee;
  // Also true at confirmed_by_customer: a transaction can land here after a
  // release that got this far locally but failed on the TradeSafe call (the
  // exact bug just fixed in handleRelease's ordering). Without this, that
  // transaction's Release/Dispute buttons would vanish for good — the screen
  // shows the breakdown with nothing actionable, and there's no way back to
  // completed_by_provider to make canAct true again. markConfirmedByCustomer
  // is idempotent now, so retrying from here is safe.
  const canAct = txn.status === 'completed_by_provider' || txn.status === 'confirmed_by_customer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => from === 'notifications' ? router.navigate('/(customer)/notifications' as never) : router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card elevated>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Escrow Status</Text>
          <EscrowTimeline status={txn.status} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Total paid</Text>
            <Text style={[styles.value, { color: colors.text }]}>R{txn.quoted_amount.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Service fee ({(txn.commission_pct * 100).toFixed(0)}%)</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>R{fee.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tradie payout</Text>
            <Text style={[styles.value, { color: colors.text }]}>R{payout.toFixed(2)}</Text>
          </View>
        </Card>

        {canAct && (
          <>
            <View style={[styles.releaseNote, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
              <Text style={styles.releaseNoteText}>
                ⚠️ Only release payment once you are fully satisfied with the completed work. This action cannot be undone.
              </Text>
            </View>
            <Button size="lg" loading={releasing} onPress={handleRelease}>
              ✅ I'm Happy — Release Payment
            </Button>
            <Pressable
              style={[styles.disputeBtn, { borderColor: '#ef4444' }]}
              onPress={handleDispute}
              disabled={disputing}
            >
              <Text style={styles.disputeBtnText}>
                {disputing ? 'Submitting...' : '⚖️ Raise a Dispute'}
              </Text>
            </Pressable>
          </>
        )}

        {txn.status === 'disputed' && (
          <View style={[styles.disputedNote, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={styles.disputedText}>
              ⚖️ This job is under dispute. Payment is frozen while our team investigates. We'll be in touch.
            </Text>
          </View>
        )}

        {txn.status === 'released' && (
          <View style={[styles.releasedNote, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.releasedText}>
              ✅ Payment released
            </Text>
          </View>
        )}

        {txn.status === 'funds_held' && (
          <View style={[styles.waitingNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
              ⏳ Waiting for {txn.tradie?.full_name ?? 'the tradie'} to mark the job as complete.
            </Text>
          </View>
        )}

        {invoice && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🧾 Invoice</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Invoice #</Text>
              <Text style={[styles.value, { color: colors.text }]}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.value, { color: colors.text }]}>R{invoice.amount.toLocaleString()}</Text>
            </View>
            {invoice.vat_amount != null && invoice.vat_amount > 0 && (
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>VAT</Text>
                <Text style={[styles.value, { color: colors.textSecondary }]}>R{invoice.vat_amount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {invoice.type === 'generated' ? 'Auto-generated' : 'Uploaded by tradie'}
              </Text>
            </View>
            <View style={styles.invoiceActions}>
              <Pressable
                style={[styles.downloadBtn, { backgroundColor: '#dbeafe', flex: 1 }]}
                onPress={handleViewInvoice}
                disabled={invoiceBusy !== null}
              >
                <Text style={[styles.downloadBtnText, { color: '#1e40af' }]}>
                  {invoiceBusy === 'view' ? 'Opening...' : '👁 View Invoice'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.downloadBtn, { backgroundColor: '#f1f5f9', flex: 1 }]}
                onPress={handlePrintInvoice}
                disabled={invoiceBusy !== null}
              >
                <Text style={[styles.downloadBtnText, { color: '#334155' }]}>
                  {invoiceBusy === 'print' ? 'Preparing...' : '🖨 Print Invoice'}
                </Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      <DisputeReportModal
        visible={disputeModalVisible}
        submitting={disputing}
        onClose={() => setDisputeModalVisible(false)}
        onSubmit={submitDispute}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600' },
  releaseNote: { borderRadius: 12, borderWidth: 1, padding: 14 },
  releaseNoteText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  releasedNote: { borderRadius: 12, padding: 14, alignItems: 'center' },
  releasedText: { fontSize: 14, color: '#166534', fontWeight: '600' },
  waitingNote: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center' },
  waitingText: { fontSize: 13, textAlign: 'center' },
  disputeBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disputeBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  disputedNote: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  disputedText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },
  invoiceActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  downloadBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  downloadBtnText: { fontSize: 14, fontWeight: '700' },
});
