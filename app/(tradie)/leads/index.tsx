import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnquotedLeads } from '@/hooks/use-jobs';

export default function TradieLeadsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { jobs, loading, refresh } = useUnquotedLeads();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Pending Quotes</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Jobs you've messaged about but haven't quoted yet
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {loading ? (
          <LoadingSpinner full />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No pending leads"
            description="Once you message a customer about a job, it'll show up here until you submit a quote."
          />
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} mode="tradie" compact />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 2 },
  back: { fontSize: 16, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
});
