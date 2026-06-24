import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { JobCategoryBadge } from '@/components/jobs/job-category-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateTimePickerModal } from '@/components/ui/date-time-picker-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import { useMyQuotes } from '@/hooks/use-quotes';
import { useSiteVisit, requestSiteVisit, markSiteVisitComplete } from '@/hooks/use-site-visits';
import { startJobConversation } from '@/hooks/use-messages';

export default function TradieJobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job, loading } = useJob(jobId);
  const { user } = useAuthStore();
  const { quotes } = useMyQuotes();
  const { visit, loading: visitLoading, refresh: refreshVisit } = useSiteVisit(jobId);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const alreadyQuoted = quotes.some((q) => q.job_id === jobId && q.status !== 'withdrawn');

  const visitStatus = visit?.status;
  const canRequestVisit = !visit;
  const visitProposed = visitStatus === 'proposed';
  const visitConfirmed = visitStatus === 'confirmed';
  const visitCompleted = visitStatus === 'completed';
  const canQuote = visitCompleted;

  async function handleRequestVisit(date: Date) {
    if (!user || !job) return;
    setSubmitting(true);
    try {
      await requestSiteVisit({
        jobId,
        tradieId: user.id,
        customerId: job.customer_id,
        proposedDatetime: date.toISOString(),
      });
      refreshVisit();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send request.');
    } finally {
      setSubmitting(false);
      setShowDatePicker(false);
    }
  }

  async function handleMarkViewed() {
    if (!visit) return;
    Alert.alert(
      'Confirm Site Visit',
      'Mark this job as viewed? This will unlock the quote form.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I\'ve Viewed It',
          onPress: async () => {
            setSubmitting(true);
            try {
              await markSiteVisitComplete(visit.id);
              refreshVisit();
            } catch {
              Alert.alert('Error', 'Could not update status.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  async function handleOpenChat() {
    if (!user || !job) return;
    setSubmitting(true);
    try {
      const conversationId = await startJobConversation(job.customer_id, user.id, jobId);
      router.push(`/(tradie)/messages/${conversationId}`);
    } catch {
      Alert.alert('Error', 'Could not open chat.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || visitLoading) return <LoadingSpinner full />;
  if (!job) return null;

  const proposedDate = visit?.proposed_datetime
    ? new Date(visit.proposed_datetime).toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

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

          {/* Site Visit Status Card */}
          {visit && (
            <Card style={[styles.visitCard, {
              borderColor: visitCompleted ? '#86efac' : visitConfirmed ? '#93c5fd' : '#fcd34d',
            }]}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitIcon}>
                  {visitCompleted ? '✅' : visitConfirmed ? '📅' : '⏳'}
                </Text>
                <View style={styles.visitInfo}>
                  <Text style={[styles.visitTitle, { color: colors.text }]}>
                    {visitCompleted ? 'Site Visit Completed' : visitConfirmed ? 'Visit Confirmed' : 'Visit Requested'}
                  </Text>
                  <Text style={[styles.visitDate, { color: colors.textSecondary }]}>
                    {proposedDate}
                  </Text>
                </View>
                <View style={[styles.visitBadge, {
                  backgroundColor: visitCompleted ? '#dcfce7' : visitConfirmed ? '#dbeafe' : '#fef9c3',
                }]}>
                  <Text style={[styles.visitBadgeText, {
                    color: visitCompleted ? '#166534' : visitConfirmed ? '#1e40af' : '#854d0e',
                  }]}>
                    {visitCompleted ? 'Viewed' : visitConfirmed ? 'Confirmed' : 'Pending'}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          {canRequestVisit && (
            <Button size="lg" onPress={() => setShowDatePicker(true)} loading={submitting}>
              📅 Request to View Job
            </Button>
          )}

          {visitProposed && (
            <View style={styles.actionGroup}>
              <View style={[styles.pendingBanner, { backgroundColor: '#fef9c3' }]}>
                <Text style={styles.pendingText}>
                  ⏳ Waiting for customer to confirm your viewing appointment
                </Text>
              </View>
              <Pressable style={[styles.chatBtn, { backgroundColor: Brand.secondary }]} onPress={handleOpenChat}>
                <Text style={styles.chatBtnText}>💬 Chat with Customer</Text>
              </Pressable>
            </View>
          )}

          {visitConfirmed && (
            <View style={styles.actionGroup}>
              <Button size="lg" onPress={handleMarkViewed} loading={submitting}>
                ✅ Mark as Viewed
              </Button>
              <Pressable style={[styles.chatBtn, { backgroundColor: Brand.secondary }]} onPress={handleOpenChat}>
                <Text style={styles.chatBtnText}>💬 Chat with Customer</Text>
              </Pressable>
            </View>
          )}

          {canQuote && !alreadyQuoted && (
            <Button size="lg" onPress={() => router.push(`/(tradie)/jobs/${jobId}/submit-quote`)}>
              Submit a Quote →
            </Button>
          )}

          {alreadyQuoted && (
            <View style={[styles.quotedBanner, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.quotedText}>✅ You have already submitted a quote for this job.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleRequestVisit}
      />
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
  visitCard: { borderWidth: 1.5, borderRadius: 14 },
  visitHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  visitIcon: { fontSize: 24 },
  visitInfo: { flex: 1, gap: 2 },
  visitTitle: { fontSize: 14, fontWeight: '700' },
  visitDate: { fontSize: 12 },
  visitBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  visitBadgeText: { fontSize: 11, fontWeight: '700' },
  actionGroup: { gap: 10 },
  pendingBanner: { borderRadius: 10, padding: 14 },
  pendingText: { color: '#854d0e', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chatBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  quotedBanner: { borderRadius: 10, padding: 14 },
  quotedText: { color: '#166534', fontSize: 14, fontWeight: '600' },
});
