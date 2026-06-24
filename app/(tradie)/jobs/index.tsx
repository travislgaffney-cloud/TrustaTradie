import React, { useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCard } from '@/components/jobs/job-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { Brand, Colors } from '@/constants/theme';
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
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | undefined>(undefined);

  const { jobs, quotedJobIds, loading, refresh } = useNearbyJobs(
    coords?.latitude ?? -26.2041,
    coords?.longitude ?? 28.0473,
    radius,
    selectedCategory
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Browse Jobs</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Within {radius} km · {jobs.length} open
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Pressable
          onPress={() => setSelectedCategory(undefined)}
          style={[
            styles.filterChip,
            { borderColor: !selectedCategory ? Brand.primary : colors.border, backgroundColor: !selectedCategory ? Brand.primaryLight : colors.surface },
          ]}
        >
          <Text style={[styles.filterText, { color: !selectedCategory ? Brand.primaryDark : colors.textSecondary }]}>All</Text>
        </Pressable>
        {TRADE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.value}
            onPress={() => setSelectedCategory(cat.value === selectedCategory ? undefined : cat.value)}
            style={[
              styles.filterChip,
              {
                borderColor: selectedCategory === cat.value ? Brand.primary : colors.border,
                backgroundColor: selectedCategory === cat.value ? Brand.primaryLight : colors.surface,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: selectedCategory === cat.value ? Brand.primaryDark : colors.textSecondary }]}>
              {cat.icon} {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading || locLoading} onRefresh={refresh} />}
      >
        {loading || locLoading ? (
          <LoadingSpinner full />
        ) : jobs.length === 0 ? (
          <EmptyState icon="🔍" title="No jobs nearby" description={selectedCategory ? `No open ${TRADE_CATEGORIES.find(c => c.value === selectedCategory)?.label ?? ''} jobs in your area right now.` : 'There are no open jobs in your service area right now. Check back soon.'} />
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} mode="tradie" hasQuoted={quotedJobIds.has(job.id)} />
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
  subtitle: { fontSize: 13, marginTop: 2 },
  filters: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
});
