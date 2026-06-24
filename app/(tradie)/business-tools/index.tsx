import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Payment, Quote } from '@/types/database';

interface BusinessStats {
  completedJobs: number;
  completedRevenue: number;
  inProgressJobs: number;
  inProgressValue: number;
  totalEarned: number;
  inEscrow: number;
  pendingQuotes: number;
  totalQuotes: number;
  acceptedQuotes: number;
  acceptanceRate: number;
  averageRating: number;
  totalReviews: number;
  avgJobValue: number;
  monthlyEarnings: { month: string; amount: number }[];
}

export default function BusinessToolsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, tradieProfile } = useAuthStore();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [
      { data: payments },
      { data: allQuotes },
      { data: completedJobs },
      { data: inProgressJobs },
    ] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .eq('tradie_id', user.id),
      supabase
        .from('quotes')
        .select('*')
        .eq('tradie_id', user.id),
      supabase
        .from('quotes')
        .select('job:jobs!quotes_job_id_fkey(id, status)')
        .eq('tradie_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('quotes')
        .select('amount, job:jobs!quotes_job_id_fkey(id, status)')
        .eq('tradie_id', user.id)
        .eq('status', 'accepted'),
    ]);

    const paymentList = (payments as Payment[]) ?? [];
    const quoteList = (allQuotes as Quote[]) ?? [];

    const released = paymentList.filter((p) => p.status === 'released');
    const escrow = paymentList.filter((p) => p.status === 'held_in_escrow');
    const totalEarned = released.reduce((s, p) => s + p.tradie_payout, 0);
    const inEscrowAmount = escrow.reduce((s, p) => s + p.tradie_payout, 0);

    const pending = quoteList.filter((q) => q.status === 'pending');
    const accepted = quoteList.filter((q) => q.status === 'accepted');
    const total = quoteList.length;
    const acceptanceRate = total > 0 ? Math.round((accepted.length / total) * 100) : 0;

    const completed = (completedJobs ?? []).filter(
      (q: any) => q.job && ['completed', 'pending_completion'].includes(q.job.status)
    );
    const completedRevenue = released.reduce((s, p) => s + p.amount_total, 0);

    const inProg = (inProgressJobs ?? []).filter(
      (q: any) => q.job && q.job.status === 'in_progress'
    );
    const inProgValue = inProg.reduce((s: number, q: any) => s + (q.amount ?? 0), 0);

    const avgJobValue = released.length > 0
      ? released.reduce((s, p) => s + p.amount_total, 0) / released.length
      : 0;

    // Monthly earnings (last 6 months)
    const monthlyMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      monthlyMap.set(key, 0);
    }
    released.forEach((p) => {
      if (p.released_at) {
        const d = new Date(p.released_at);
        const key = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + p.tradie_payout);
        }
      }
    });
    const monthlyEarnings = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    setStats({
      completedJobs: completed.length,
      completedRevenue,
      inProgressJobs: inProg.length,
      inProgressValue: inProgValue,
      totalEarned,
      inEscrow: inEscrowAmount,
      pendingQuotes: pending.length,
      totalQuotes: total,
      acceptedQuotes: accepted.length,
      acceptanceRate,
      averageRating: tradieProfile?.average_rating ?? 0,
      totalReviews: tradieProfile?.total_reviews ?? 0,
      avgJobValue,
      monthlyEarnings,
    });
    setLoading(false);
  }, [user, tradieProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxMonthly = stats
    ? Math.max(...stats.monthlyEarnings.map((m) => m.amount), 1)
    : 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Business Tools</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={Brand.primary} />}
      >
        {!stats ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        ) : (
          <>
            {/* Revenue Overview */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Overview</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <Text style={styles.statLabel}>Total Earned</Text>
                <Text style={[styles.statValue, { color: '#166534' }]}>R{stats.totalEarned.toLocaleString()}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
                <Text style={styles.statLabel}>In Escrow</Text>
                <Text style={[styles.statValue, { color: '#92400e' }]}>R{stats.inEscrow.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Job Value</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>R{Math.round(stats.avgJobValue).toLocaleString()}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>R{stats.completedRevenue.toLocaleString()}</Text>
              </View>
            </View>

            {/* Jobs Overview */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Jobs Overview</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }]}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={[styles.statValue, { color: '#1e40af' }]}>{stats.completedJobs}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                <Text style={styles.statLabel}>In Progress</Text>
                <Text style={[styles.statValue, { color: '#92400e' }]}>{stats.inProgressJobs}</Text>
              </View>
            </View>
            {stats.inProgressJobs > 0 && (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>In-progress jobs worth</Text>
                <Text style={[styles.infoValue, { color: Brand.primary }]}>R{stats.inProgressValue.toLocaleString()}</Text>
              </View>
            )}

            {/* Quotes Overview */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quotes Overview</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sent</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalQuotes}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                <Text style={[styles.statValue, { color: '#854d0e' }]}>{stats.pendingQuotes}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accepted</Text>
                <Text style={[styles.statValue, { color: '#166534' }]}>{stats.acceptedQuotes}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Win Rate</Text>
                <Text style={[styles.statValue, { color: Brand.primary }]}>{stats.acceptanceRate}%</Text>
              </View>
            </View>

            {/* Reputation */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reputation</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
                <Text style={styles.statLabel}>Avg Rating</Text>
                <Text style={[styles.statValue, { color: '#92400e' }]}>
                  ⭐ {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reviews</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalReviews}</Text>
              </View>
            </View>

            {/* Monthly Earnings Chart */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Earnings</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.chartBars}>
                {stats.monthlyEarnings.map((m) => (
                  <View key={m.month} style={styles.barCol}>
                    <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                      {m.amount > 0 ? `R${Math.round(m.amount / 1000)}k` : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max((m.amount / maxMonthly) * 100, 4)}%`,
                            backgroundColor: Brand.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{m.month}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bank Details */}
            <Pressable
              style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/(tradie)/earnings/bank-details')}
            >
              <Text style={styles.linkIcon}>🏦</Text>
              <Text style={[styles.linkText, { color: colors.text }]}>Update Bank Details</Text>
              <Text style={[styles.linkArrow, { color: colors.textSecondary }]}>›</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 60 },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  loadingText: { textAlign: 'center', paddingVertical: 40, fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '900' },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 20, fontWeight: '900' },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: { fontSize: 10, fontWeight: '600' },
  barTrack: {
    width: '70%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 10, fontWeight: '500' },
  linkCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: { fontSize: 24 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600' },
  linkArrow: { fontSize: 22, fontWeight: '300' },
});
