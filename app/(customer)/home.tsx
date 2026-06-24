import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyJobs } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const { jobs, loading, refresh } = useMyJobs();

  const activeJobs = jobs.filter((j) =>
    ['open', 'quotes_received', 'accepted', 'in_progress', 'pending_completion'].includes(j.status)
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.greeting}>
                Hello, {profile?.full_name?.split(' ')[0] ?? 'there'}
              </Text>
              <Text style={styles.headerSubtitle}>Find trusted tradies for your home</Text>
            </View>
            <Pressable onPress={() => router.push('/(customer)/profile')}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} color="#38BDF8" />
            </Pressable>
          </View>
          <View style={styles.headerBtns}>
            <Pressable
              style={styles.postJobBtn}
              onPress={() => router.push('/(customer)/post-job/details')}
            >
              <Text style={styles.postJobText}>+ Post a Job</Text>
            </Pressable>
            <Pressable
              style={styles.calBtn}
              onPress={() => router.push('/(customer)/calendar')}
            >
              <Text style={styles.calBtnText}>📅 Calendar</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{activeJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {jobs.filter((j) => j.status === 'completed').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {jobs.filter((j) => j.status === 'quotes_received').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New Quotes</Text>
          </View>
        </View>

        {/* Active jobs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Jobs</Text>
          {loading ? (
            <LoadingSpinner />
          ) : activeJobs.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No active jobs"
              description="Post your first job to receive quotes from local tradies"
            />
          ) : (
            activeJobs.map((job) => <JobCard key={job.id} job={job} mode="customer" />)
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, gap: 0, paddingBottom: 32 },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: { flex: 1, gap: 4 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  headerBtns: { flexDirection: 'row', gap: 10 },
  postJobBtn: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  postJobText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  calBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  calBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  section: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
});
