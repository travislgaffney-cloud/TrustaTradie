import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EscrowTimeline } from '@/components/payments/escrow-timeline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useInvoice } from '@/hooks/use-invoices';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import type { Payment } from '@/types/database';

export default function PaymentDetailScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const { invoice } = useInvoice(paymentId);

  useEffect(() => {
    load();
  }, [paymentId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, job:jobs(*), tradie:profiles!payments_tradie_id_fkey(*)')
      .eq('id', paymentId)
      .single<Payment>();
    setPayment(data ?? null);
    setLoading(false);
  }

  async function handleRelease() {
    if (!payment) return;
    setReleasing(true);
    await supabase.functions.invoke('release-payment', {
      body: { payment_id: payment.id, job_id: payment.job_id },
    });
    await load();
    setReleasing(false);
    router.push(`/rate/${payment.job_id}`);
  }

  function handleDispute() {
    if (!payment) return;
    Alert.alert(
      'Raise a Dispute',
      'Are you unsatisfied with the work? This will freeze the payment and notify our admin team to investigate.\n\nPlease only dispute if there is a genuine issue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise Dispute',
          style: 'destructive',
          onPress: async () => {
            setDisputing(true);
            try {
              await supabase
                .from('jobs')
                .update({ status: 'disputed' })
                .eq('id', payment.job_id);

              // Notify admins
              const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin');
              const body = `A customer has raised a dispute for job "${(payment.job as any)?.title ?? 'a job'}" — R${payment.amount_total.toLocaleString()} held in escrow`;
              for (const admin of admins ?? []) {
                await supabase.from('notifications').insert({
                  user_id: admin.id,
                  type: 'job_completed',
                  title: '⚖️ Dispute Raised',
                  body,
                  data: { job_id: payment.job_id },
                  is_read: false,
                });
                sendPushToUser(admin.id, '⚖️ Dispute Raised', body);
              }

              // Notify tradie
              const tradieBody = `The customer has raised a dispute for "${(payment.job as any)?.title ?? 'a job'}". Payment is on hold while our team investigates.`;
              await supabase.from('notifications').insert({
                user_id: payment.tradie_id,
                type: 'job_completed',
                title: 'Dispute Raised',
                body: tradieBody,
                data: { job_id: payment.job_id },
                is_read: false,
              });
              sendPushToUser(payment.tradie_id, 'Dispute Raised', tradieBody);

              await load();
              Alert.alert('Dispute Raised', 'Our team has been notified and will investigate. The payment remains frozen until resolved.');
            } catch {
              Alert.alert('Error', 'Could not raise dispute. Please try again.');
            } finally {
              setDisputing(false);
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner full />;
  if (!payment) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card elevated>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Escrow Status</Text>
          <EscrowTimeline status={payment.status} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Total paid</Text>
            <Text style={[styles.value, { color: colors.text }]}>R{payment.amount_total.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Service fee (5%)</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>R{payment.platform_fee.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tradie payout</Text>
            <Text style={[styles.value, { color: colors.text }]}>R{payment.tradie_payout.toFixed(2)}</Text>
          </View>
          {payment.paid_at && (
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              Paid: {new Date(payment.paid_at).toLocaleDateString('en-ZA')}
            </Text>
          )}
        </Card>

        {payment.status === 'held_in_escrow' && (
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

        {(payment.job as any)?.status === 'disputed' && (
          <View style={[styles.disputedNote, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={styles.disputedText}>
              ⚖️ This job is under dispute. Payment is frozen while our team investigates. We'll be in touch.
            </Text>
          </View>
        )}

        {payment.status === 'released' && payment.released_at && (
          <View style={[styles.releasedNote, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.releasedText}>
              ✅ Payment released on {new Date(payment.released_at).toLocaleDateString('en-ZA')}
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
            {invoice.uploaded_url && (
              <Pressable
                style={[styles.downloadBtn, { backgroundColor: '#dbeafe' }]}
                onPress={() => Linking.openURL(invoice.uploaded_url!)}
              >
                <Text style={[styles.downloadBtnText, { color: '#1e40af' }]}>📥 View Invoice Document</Text>
              </Pressable>
            )}
          </Card>
        )}
      </ScrollView>
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
  date: { fontSize: 12, marginTop: 8 },
  releaseNote: { borderRadius: 12, borderWidth: 1, padding: 14 },
  releaseNoteText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  releasedNote: { borderRadius: 12, padding: 14, alignItems: 'center' },
  releasedText: { fontSize: 14, color: '#166534', fontWeight: '600' },
  downloadBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  downloadBtnText: { fontSize: 14, fontWeight: '700' },
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
});
