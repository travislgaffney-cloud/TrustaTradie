import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyJobs } from '@/hooks/use-jobs';
import type { JobStatus } from '@/types/database';

type Filter = 'active' | 'completed' | 'all';

export default function CustomerJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { jobs, loading, refresh } = useMyJobs();
  const [filter, setFilter] = useState<Filter>('active');

  const ACTIVE_STATUSES: JobStatus[] = ['open', 'quotes_received', 'accepted', 'in_progress', 'pending_completion'];

  const filtered = jobs.filter((j) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(j.status);
    if (filter === 'completed') return j.status === 'completed';
    return true;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Jobs</Text>
        <Button size="sm" onPress={() => router.push('/(customer)/post-job/details')}>
          + Post Job
        </Button>
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
          filtered.map((job) => <JobCard key={job.id} job={job} mode="customer" />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '500' },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
});
