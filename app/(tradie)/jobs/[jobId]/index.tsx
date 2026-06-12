import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCategoryBadge } from '@/components/jobs/job-category-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import { useMyQuotes } from '@/hooks/use-quotes';

export default function TradieJobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job, loading } = useJob(jobId);
  const { user } = useAuthStore();
  const { quotes } = useMyQuotes();

  const alreadyQuoted = quotes.some((q) => q.job_id === jobId && q.status !== 'withdrawn');

  if (loading) return <LoadingSpinner full />;
  if (!job) return null;

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
          <JobCategoryBadge category={job.category} />
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
              <Text style={[styles.infoRow, { color: colors.textSecondary }]}>📅 Start: {job.preferred_start}</Text>
            )}
            <Text style={[styles.infoRow, { color: colors.textSecondary }]}>
              📅 Posted {new Date(job.created_at).toLocaleDateString('en-ZA')}
            </Text>
          </Card>

          {alreadyQuoted ? (
            <View style={[styles.quotedBanner, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.quotedText}>✅ You have already submitted a quote for this job.</Text>
            </View>
          ) : (
            <Button size="lg" onPress={() => router.push(`/(tradie)/jobs/${jobId}/submit-quote`)}>
              Submit a Quote →
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
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  infoCard: { gap: 8 },
  infoRow: { fontSize: 14 },
  quotedBanner: { borderRadius: 10, padding: 14 },
  quotedText: { color: '#166534', fontSize: 14, fontWeight: '600' },
});
