import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCategoryBadge } from '@/components/jobs/job-category-badge';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { useJobQuotes } from '@/hooks/use-quotes';

export default function CustomerJobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job, loading } = useJob(jobId);
  const { quotes } = useJobQuotes(jobId);

  if (loading) return <LoadingSpinner full />;
  if (!job) return null;

  const pendingQuotes = quotes.filter((q) => q.status === 'pending');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Job Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {job.images && job.images.length > 0 && (
          <Image source={{ uri: job.images[0].url }} style={styles.heroImage} />
        )}

        <View style={styles.content}>
          <View style={styles.badges}>
            <JobCategoryBadge category={job.category} />
            <JobStatusBadge status={job.status} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{job.description}</Text>

          <Card style={styles.infoCard}>
            <Text style={[styles.infoRow, { color: colors.textSecondary }]}>📍 {job.address_text}</Text>
            {job.budget_min && (
              <Text style={[styles.infoRow, { color: colors.textSecondary }]}>
                💰 Budget: R{job.budget_min.toLocaleString()}{job.budget_max ? ` – R${job.budget_max.toLocaleString()}` : '+'}
              </Text>
            )}
            {job.preferred_start && (
              <Text style={[styles.infoRow, { color: colors.textSecondary }]}>
                📅 Preferred start: {job.preferred_start}
              </Text>
            )}
          </Card>

          {/* Quotes CTA */}
          {pendingQuotes.length > 0 ? (
            <Button
              size="lg"
              onPress={() => router.push(`/(customer)/jobs/${jobId}/quotes`)}
            >
              View {pendingQuotes.length} Quote{pendingQuotes.length !== 1 ? 's' : ''} →
            </Button>
          ) : job.status === 'open' ? (
            <Card style={[styles.waitingCard, { borderColor: colors.border }]}>
              <Text style={styles.waitingIcon}>⏳</Text>
              <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for quotes</Text>
              <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
                Tradies in your area have been notified. You'll receive push notifications when quotes arrive.
              </Text>
            </Card>
          ) : null}

          {/* In progress: show chat button */}
          {['in_progress', 'pending_completion'].includes(job.status) && (
            <Button
              variant="secondary"
              onPress={() => router.push(`/(customer)/messages`)}
            >
              💬 Message Tradie
            </Button>
          )}

          {/* Pending completion: release payment */}
          {job.status === 'pending_completion' && (
            <Button
              onPress={() => router.push(`/(customer)/payments/${job.accepted_quote_id}`)}
            >
              ✅ Approve Completion & Release Payment
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { flexGrow: 1 },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  content: { padding: 16, gap: 14 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  infoCard: { gap: 8 },
  infoRow: { fontSize: 14 },
  waitingCard: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  waitingIcon: { fontSize: 40 },
  waitingTitle: { fontSize: 16, fontWeight: '700' },
  waitingDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
