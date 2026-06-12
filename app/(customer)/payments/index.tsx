import { router } from 'expo-router';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Payment } from '@/types/database';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fffbeb', text: '#92400e' },
  held_in_escrow: { bg: '#dbeafe', text: '#1e40af' },
  released: { bg: '#dcfce7', text: '#166534' },
  refunded: { bg: '#f1f5f9', text: '#64748b' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
};

export default function CustomerPaymentsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, job:jobs(title, category)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false });
    setPayments((data as Payment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (user) fetch(); }, [user]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Payments</Text>
      </View>
      {loading ? <LoadingSpinner full /> : payments.length === 0 ? (
        <EmptyState icon="💳" title="No payments yet" description="Payments appear here after you accept a tradie quote." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}>
          {payments.map((p) => {
            const sc = STATUS_COLOR[p.status] ?? { bg: '#f1f5f9', text: '#64748b' };
            const job = p.job as unknown as { title: string } | undefined;
            return (
              <Pressable key={p.id} onPress={() => router.push(`/(customer)/payments/${p.id}`)}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{job?.title ?? 'Job'}</Text>
                    <Text style={[styles.amount, { color: colors.text }]}>R{p.amount_total.toLocaleString()}</Text>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>
                      {format(new Date(p.created_at), 'dd MMM yyyy')}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{p.status.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  scroll: { padding: 16, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  amount: { fontSize: 18, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12 },
  statusPill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
