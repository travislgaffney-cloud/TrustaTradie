import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Transaction, Job, TransactionStatus } from '@/types/database';

type TransactionWithJob = Transaction & { job?: Job };

const ESCROW_STATUSES: TransactionStatus[] = ['funds_held', 'completed_by_provider', 'confirmed_by_customer'];

function payoutOf(t: Transaction): number {
  return t.quoted_amount - t.quoted_amount * t.commission_pct;
}

function statusLabel(status: TransactionStatus): string {
  if (status === 'released') return '✅ Released';
  if (ESCROW_STATUSES.includes(status)) return '🔒 In Escrow';
  if (status === 'accepted') return '⏳ Awaiting Payment';
  if (status === 'disputed') return '⚖️ Disputed';
  return status.replace(/_/g, ' ');
}

export default function EarningsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<TransactionWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user) return;
    supabase
      .from('transactions')
      .select('*, job:jobs(title)')
      .eq('tradie_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTransactions((data as TransactionWithJob[]) ?? []); setLoading(false); });
  }

  useEffect(load, [user]);
  useRefreshOnFocus(load);

  const released = transactions.filter((t) => t.status === 'released');
  const pending = transactions.filter((t) => ESCROW_STATUSES.includes(t.status));
  const totalEarned = released.reduce((s, t) => s + payoutOf(t), 0);
  const pendingAmount = pending.reduce((s, t) => s + payoutOf(t), 0);

  if (loading) return <LoadingSpinner full />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Earnings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={[styles.statValue, { color: '#166534' }]}>R{totalEarned.toLocaleString()}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
            <Text style={styles.statLabel}>In Escrow</Text>
            <Text style={[styles.statValue, { color: '#92400e' }]}>R{pendingAmount.toLocaleString()}</Text>
          </View>
        </View>

        <Button variant="secondary" onPress={() => router.push('/(tradie)/earnings/bank-details')}>
          🏦 Update Bank Details
        </Button>
        <Button variant="secondary" onPress={() => router.push('/(tradie)/earnings/report')}>
          🧾 SARS Report
        </Button>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
        {transactions.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No payments yet.</Text>
        ) : (
          transactions.map((t) => (
            <Card key={t.id} style={styles.paymentCard}>
              <Text style={[styles.paymentJob, { color: colors.text }]} numberOfLines={1}>
                {t.job?.title ?? 'Job'}
              </Text>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentAmount, { color: colors.text }]}>R{payoutOf(t).toFixed(2)}</Text>
                <Text style={[
                  styles.paymentStatus,
                  { color: t.status === 'released' ? '#166534' : ESCROW_STATUSES.includes(t.status) ? '#92400e' : colors.textSecondary },
                ]}>
                  {statusLabel(t.status)}
                </Text>
              </View>
              {t.status === 'released' && (
                <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                  Released {new Date(t.updated_at).toLocaleDateString('en-ZA')}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  scroll: { padding: 16, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16, gap: 4 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: 24, fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  paymentCard: { gap: 6 },
  paymentJob: { fontSize: 14, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentAmount: { fontSize: 18, fontWeight: '800' },
  paymentStatus: { fontSize: 13, fontWeight: '500' },
  paymentDate: { fontSize: 12 },
});
