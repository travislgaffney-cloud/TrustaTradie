import React, { useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocation } from '@/hooks/use-location';
import { useNearbyJobs } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';

export default function TradieJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { tradieProfile } = useAuthStore();
  const { coords, loading: locLoading } = useLocation();
  const radius = tradieProfile?.service_radius_km ?? 50;
  const { jobs, loading, refresh } = useNearbyJobs(
    coords?.latitude ?? -26.2041,
    coords?.longitude ?? 28.0473,
    radius
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Browse Jobs</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Within {radius} km · {jobs.length} open
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading || locLoading} onRefresh={refresh} />}
      >
        {loading || locLoading ? (
          <LoadingSpinner full />
        ) : jobs.length === 0 ? (
          <EmptyState icon="🔍" title="No jobs nearby" description="There are no open jobs in your service area right now. Check back soon." />
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} mode="tradie" />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
});
