import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTownJobs, useUnquotedLeads } from '@/hooks/use-jobs';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Job } from '@/types/database';

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]}`;
}

function categoryIcon(cat: string) {
  return TRADE_CATEGORIES.find((c) => c.value === cat)?.icon ?? '🔧';
}

function categoryLabel(cat: string) {
  return TRADE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

const DASHBOARD_ACTIONS = [
  {
    key: 'browse',
    icon: '🔍',
    label: 'Browse Jobs',
    sub: 'Find nearby work',
    route: '/(tradie)/jobs',
    bg: '#dbeafe',
    border: '#93c5fd',
    textColor: '#1e40af',
  },
  {
    key: 'my-jobs',
    icon: '💼',
    label: 'My Jobs',
    sub: 'Quotes & active jobs',
    route: '/(tradie)/my-quotes',
    bg: '#dcfce7',
    border: '#86efac',
    textColor: '#166534',
  },
  {
    key: 'calendar',
    icon: '📅',
    label: 'Calendar',
    sub: 'Scheduled bookings',
    route: '/(tradie)/calendar',
    bg: '#fef3c7',
    border: '#fcd34d',
    textColor: '#92400e',
  },
  {
    key: 'business',
    icon: '📊',
    label: 'Business Tools',
    sub: 'Stats & earnings',
    route: '/(tradie)/business-tools',
    bg: '#f3e8ff',
    border: '#c4b5fd',
    textColor: '#6b21a8',
  },
] as const;

export default function TradieHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile, user } = useAuthStore();
  const serviceTowns = tradieProfile?.service_towns ?? [];

  const { jobs: nearbyJobs, loading: nearbyLoading, refresh: refreshNearby } = useTownJobs(serviceTowns);
  const { jobs: leads, refresh: refreshLeads } = useUnquotedLeads();

  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchActiveJobs();
  }, [user]);

  useRefreshOnFocus(() => {
    if (user) fetchActiveJobs();
  });

  async function fetchActiveJobs() {
    setActiveLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('job:jobs!quotes_job_id_fkey(*)')
      .eq('tradie_id', user!.id)
      .eq('status', 'accepted');

    const jobs = (data ?? [])
      .map((q: any) => q.job)
      .filter((j: any) => j && ['accepted', 'in_progress'].includes(j.status))
      .sort((a: Job, b: Job) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActiveJobs(jobs as Job[]);
    setActiveLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchActiveJobs(), refreshLeads(), refreshNearby()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerGreeting}>
            {greeting(profile?.full_name ?? 'Tradie')}
          </Text>
          <Text style={styles.bannerSub}>
            {tradieProfile?.average_rating
              ? `⭐ ${tradieProfile.average_rating.toFixed(1)} · ${tradieProfile.total_reviews} review${tradieProfile.total_reviews !== 1 ? 's' : ''}`
              : 'Welcome to TrustaTradie'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tradie)/profile')}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={44} color="#38BDF8" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />}
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Pressable
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: Brand.primary }]}
            onPress={() => router.push('/(tradie)/my-quotes')}
          >
            <Text style={[styles.statNum, { color: Brand.primary }]}>{activeJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Jobs</Text>
          </Pressable>
          <Pressable
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tradie)/jobs')}
          >
            <Text style={[styles.statNum, { color: Brand.secondary }]}>{nearbyJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Leads in My Towns</Text>
          </Pressable>
          <Pressable
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tradie)/leads')}
          >
            <Text style={[styles.statNum, { color: '#854d0e' }]}>{leads.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Quotes</Text>
          </Pressable>
        </View>

        {/* Dashboard Actions */}
        <View style={styles.actionsGrid}>
          {DASHBOARD_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={[styles.actionCard, { backgroundColor: action.bg, borderColor: action.border }]}
              onPress={() => router.push(action.route as any)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: action.textColor }]}>{action.label}</Text>
              <Text style={[styles.actionSub, { color: action.textColor, opacity: 0.7 }]}>{action.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Jobs</Text>
            {activeJobs.map((job) => (
              <Pressable
                key={job.id}
                onPress={() => router.push(`/(tradie)/my-quotes` as any)}
                style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: Brand.primary }]}
              >
                <View style={styles.jobCardRow}>
                  <Text style={styles.jobIcon}>{categoryIcon(job.category)}</Text>
                  <View style={styles.jobCardText}>
                    <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{job.title}</Text>
                    <Text style={[styles.jobMeta, { color: colors.textSecondary }]}>
                      {job.suburb ?? job.address_text} · {categoryLabel(job.category)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: job.status === 'in_progress' ? '#dcfce7' : '#dbeafe'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: job.status === 'in_progress' ? '#166534' : '#1e40af'
                    }]}>
                      {job.status === 'in_progress' ? 'In Progress' : 'Booked'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bannerText: { gap: 4, flex: 1 },
  bannerGreeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  scroll: { padding: 16, gap: 10, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 6,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 16, fontWeight: '800' },
  actionSub: { fontSize: 12, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  jobCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  jobCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobIcon: { fontSize: 26 },
  jobCardText: { flex: 1, gap: 3 },
  jobTitle: { fontSize: 15, fontWeight: '700' },
  jobMeta: { fontSize: 12 },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, fontWeight: '300' },
});
