import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteJob, useMyJobs } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import type { JobStatus } from '@/types/database';

type Filter = 'active' | 'completed' | 'all';

export default function CustomerJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const { jobs, loading, refresh } = useMyJobs();
  const [filter, setFilter] = useState<Filter>('active');

  const ACTIVE_STATUSES: JobStatus[] = ['open', 'quotes_received', 'accepted', 'in_progress', 'pending_completion'];

  const filtered = jobs.filter((j) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(j.status);
    if (filter === 'completed') return j.status === 'completed';
    return true;
  });

  async function handleDeleteJob(jobId: string) {
    try {
      await deleteJob(jobId);
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to delete job');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>My Jobs</Text>
            <Text style={styles.headerSubtitle}>Track your posted jobs and quotes</Text>
          </View>
          <Pressable onPress={() => router.push('/(customer)/profile')}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} color="#38BDF8" />
          </Pressable>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['active', 'completed', 'all'] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabText, { color: filter === f ? colors.tint : colors.textSecondary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {loading ? (
          <LoadingSpinner full />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title={filter === 'active' ? 'No active jobs' : filter === 'completed' ? 'No completed jobs yet' : 'No jobs yet'}
            description="Post a job to get quotes from trusted tradies in your area"
            actionLabel="Post a Job"
            onAction={() => router.push('/(customer)/post-job/details')}
          />
        ) : (
          filtered.map((job) => (
            <JobCard key={job.id} job={job} mode="customer" onDelete={() => handleDeleteJob(job.id)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 4,
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '500' },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
});
