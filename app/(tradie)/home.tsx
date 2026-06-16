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
import { useLocation } from '@/hooks/use-location';
import { useNearbyJobs } from '@/hooks/use-jobs';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Job } from '@/types/database';

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]}`;
}

function categoryLabel(cat: string) {
  return TRADE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function categoryIcon(cat: string) {
  return TRADE_CATEGORIES.find((c) => c.value === cat)?.icon ?? '🔧';
}

export default function TradieHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile, user } = useAuthStore();
  const { coords } = useLocation();
  const radius = tradieProfile?.service_radius_km ?? 50;

  const { jobs: nearbyJobs, loading: nearbyLoading, refresh: refreshNearby } = useNearbyJobs(
    coords?.latitude ?? -26.2041,
    coords?.longitude ?? 28.0473,
    radius
  );

  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchActiveJobs();
  }, [user]);

  async function fetchActiveJobs() {
    setActiveLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, quotes!inner(tradie_id, status)')
      .eq('quotes.tradie_id', user!.id)
      .eq('quotes.status', 'accepted')
      .in('status', ['active', 'in_progress']);
    setActiveJobs((data as Job[]) ?? []);
    setActiveLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchActiveJobs(), refreshNearby()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Navy banner */}
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerGreeting}>
            {greeting(profile?.full_name ?? 'Tradie')}
          </Text>
          <Text style={styles.bannerSub}>
            {nearbyJobs.length} job{nearbyJobs.length !== 1 ? 's' : ''} available within {radius} km
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tradie)/profile')}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={40} color="#38BDF8" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: Brand.primary }]}>{activeJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: Brand.secondary }]}>{nearbyJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nearby Leads</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{radius}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>km Radius</Text>
          </View>
        </View>

        {/* Active jobs */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Active Jobs</Text>
        {activeLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        ) : activeJobs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No active jobs yet. Win a quote to get started!
            </Text>
          </View>
        ) : (
          activeJobs.map((job) => (
            <Pressable
              key={job.id}
              onPress={() => router.push(`/(tradie)/jobs/${job.id}`)}
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
                <View style={[styles.activeBadge, { backgroundColor: Brand.primaryLight }]}>
                  <Text style={[styles.activeBadgeText, { color: Brand.primaryDark }]}>Active</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        {/* Nearby jobs */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby Jobs</Text>
        {nearbyLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        ) : nearbyJobs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No open jobs within {radius} km right now.
            </Text>
          </View>
        ) : (
          nearbyJobs.map((job) => (
            <Pressable
              key={job.id}
              onPress={() => router.push(`/(tradie)/jobs/${job.id}`)}
              style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.jobCardRow}>
                <Text style={styles.jobIcon}>{categoryIcon(job.category)}</Text>
                <View style={styles.jobCardText}>
                  <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{job.title}</Text>
                  <Text style={[styles.jobMeta, { color: colors.textSecondary }]}>
                    {job.suburb ?? job.address_text} · {categoryLabel(job.category)}
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
              </View>
            </Pressable>
          ))
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
  bannerText: { gap: 4 },
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
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 8 },
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
  activeBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, fontWeight: '300' },
});
