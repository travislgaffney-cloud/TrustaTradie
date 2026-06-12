import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Payment } from '@/types/database';

export default function EarningsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('payments')
      .select('*, job:jobs(title)')
      .eq('tradie_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPayments((data as Payment[]) ?? []); setLoading(false); });
  }, [user]);

  const released = payments.filter((p) => p.status === 'released');
  const pending = payments.filter((p) => p.status === 'held_in_escrow');
  const totalEarned = released.reduce((s, p) => s + p.tradie_payout, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.tradie_payout, 0);

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

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
        {payments.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No payments yet.</Text>
        ) : (
          payments.map((p) => (
            <Card key={p.id} style={styles.paymentCard}>
              <Text style={[styles.paymentJob, { color: colors.text }]} numberOfLines={1}>
                {(p.job as unknown as Record<string, unknown>)?.title as string ?? 'Job'}
              </Text>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentAmount, { color: colors.text }]}>R{p.tradie_payout.toFixed(2)}</Text>
                <Text style={[
                  styles.paymentStatus,
                  { color: p.status === 'released' ? '#166534' : p.status === 'held_in_escrow' ? '#92400e' : colors.textSecondary },
                ]}>
                  {p.status === 'released' ? '✅ Released' : p.status === 'held_in_escrow' ? '🔒 In Escrow' : p.status}
                </Text>
              </View>
              {p.released_at && (
                <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                  Released {new Date(p.released_at).toLocaleDateString('en-ZA')}
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
