import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobCategoryBadge } from '@/components/jobs/job-category-badge';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateTimePickerModal } from '@/components/ui/date-time-picker-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { useJobQuotes } from '@/hooks/use-quotes';
import { useJobSiteVisits, respondToSiteVisit } from '@/hooks/use-site-visits';

export default function CustomerJobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job, loading, refresh: refreshJob } = useJob(jobId);
  const { quotes, refresh: refreshQuotes } = useJobQuotes(jobId);
  const { visits, loading: visitsLoading, refresh: refreshVisits } = useJobSiteVisits(jobId);

  const [suggestingVisitId, setSuggestingVisitId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { refreshJob(); refreshQuotes(); refreshVisits(); }, []));

  async function handleConfirmVisit(visitId: string) {
    setRespondingId(visitId);
    try {
      await respondToSiteVisit({ visitId, action: 'confirm' });
      refreshVisits();
    } catch {
      Alert.alert('Error', 'Could not confirm visit.');
    } finally {
      setRespondingId(null);
    }
  }

  async function handleSuggestDate(visitId: string, date: Date) {
    setRespondingId(visitId);
    try {
      await respondToSiteVisit({ visitId, action: 'suggest', newDatetime: date.toISOString() });
      refreshVisits();
    } catch {
      Alert.alert('Error', 'Could not suggest new date.');
    } finally {
      setRespondingId(null);
      setSuggestingVisitId(null);
    }
  }

  if (loading) return <LoadingSpinner full />;
  if (!job) return null;

  const pendingVisits = visits.filter((v) => v.status === 'proposed');
  const confirmedVisits = visits.filter((v) => v.status === 'confirmed');
  const completedVisits = visits.filter((v) => v.status === 'completed');

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

          {/* Site Visit Requests */}
          {pendingVisits.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Viewing Requests ({pendingVisits.length})
              </Text>
              {pendingVisits.map((v) => {
                const date = new Date(v.proposed_datetime).toLocaleDateString('en-ZA', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <Card key={v.id} style={[styles.visitCard, { borderColor: '#fcd34d' }]}>
                    <View style={styles.visitRow}>
                      <Avatar uri={v.tradie?.avatar_url} name={v.tradie?.full_name} size={36} />
                      <View style={styles.visitInfo}>
                        <Text style={[styles.visitName, { color: colors.text }]}>
                          {v.tradie?.full_name ?? 'Tradie'}
                        </Text>
                        <Text style={[styles.visitDate, { color: colors.textSecondary }]}>
                          📅 Proposed: {date}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.visitActions}>
                      <Pressable
                        style={[styles.confirmBtn, { opacity: respondingId === v.id ? 0.5 : 1 }]}
                        onPress={() => handleConfirmVisit(v.id)}
                        disabled={respondingId === v.id}
                      >
                        <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.suggestBtn, { borderColor: Brand.secondary }]}
                        onPress={() => setSuggestingVisitId(v.id)}
                        disabled={respondingId === v.id}
                      >
                        <Text style={[styles.suggestBtnText, { color: Brand.secondary }]}>Suggest Another Date</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* Confirmed Visits */}
          {confirmedVisits.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Confirmed Visits</Text>
              {confirmedVisits.map((v) => {
                const date = new Date(v.proposed_datetime).toLocaleDateString('en-ZA', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <Card key={v.id} style={[styles.visitCard, { borderColor: '#93c5fd' }]}>
                    <View style={styles.visitRow}>
                      <Avatar uri={v.tradie?.avatar_url} name={v.tradie?.full_name} size={36} />
                      <View style={styles.visitInfo}>
                        <Text style={[styles.visitName, { color: colors.text }]}>
                          {v.tradie?.full_name ?? 'Tradie'}
                        </Text>
                        <Text style={[styles.visitDate, { color: colors.textSecondary }]}>
                          📅 {date}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#1e40af' }]}>Confirmed</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* Quotes CTA */}
          {quotes.length > 0 ? (
            <Button
              size="lg"
              onPress={() => router.push(`/(customer)/jobs/${jobId}/quotes`)}
            >
              View {quotes.length} Quote{quotes.length !== 1 ? 's' : ''} →
            </Button>
          ) : job.status === 'open' ? (
            <Card style={[styles.waitingCard, { borderColor: colors.border }]}>
              <Text style={styles.waitingIcon}>⏳</Text>
              <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for quotes</Text>
              <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
                Tradies will request to view your job first, then submit quotes after their visit.
              </Text>
            </Card>
          ) : null}

          {['in_progress', 'pending_completion'].includes(job.status) && (
            <Button
              variant="secondary"
              onPress={() => router.push(`/(customer)/messages`)}
            >
              💬 Message Tradie
            </Button>
          )}

          {job.status === 'pending_completion' && (
            <Button
              onPress={() => router.push(`/(customer)/payments/${job.accepted_quote_id}`)}
            >
              ✅ Approve Completion & Release Payment
            </Button>
          )}
        </View>
      </ScrollView>

      <DateTimePickerModal
        visible={suggestingVisitId !== null}
        onClose={() => setSuggestingVisitId(null)}
        onConfirm={(date) => suggestingVisitId && handleSuggestDate(suggestingVisitId, date)}
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
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  infoCard: { gap: 8 },
  infoRow: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  visitCard: { borderWidth: 1.5, borderRadius: 14, gap: 12 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  visitInfo: { flex: 1, gap: 2 },
  visitName: { fontSize: 14, fontWeight: '700' },
  visitDate: { fontSize: 12 },
  visitActions: { flexDirection: 'row', gap: 8 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  suggestBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  suggestBtnText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
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
