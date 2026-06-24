import { router, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyQuotes } from '@/hooks/use-quotes';
import { useMyTradieJobs, startJob, completeJob } from '@/hooks/use-jobs';
import { startJobConversation } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';
import { ReviewRequestButton } from '@/components/jobs/review-request-button';
import type { Quote, Job } from '@/types/database';

type Tab = 'quotes' | 'jobs';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  accepted:  { bg: '#dcfce7', text: '#166534' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
  withdrawn: { bg: '#f1f5f9', text: '#475569' },
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Submitted',
  accepted:  'Accepted ✅',
  rejected:  'Rejected',
  withdrawn: 'Withdrawn',
};

const JOB_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  accepted:            { bg: '#dbeafe', text: '#1e40af' },
  in_progress:         { bg: '#dcfce7', text: '#166534' },
  pending_completion:  { bg: '#fef9c3', text: '#854d0e' },
  completed:           { bg: '#f1f5f9', text: '#475569' },
};

const JOB_STATUS_LABEL: Record<string, string> = {
  accepted:            'Booked',
  in_progress:         'In Progress',
  pending_completion:  'Pending Completion',
  completed:           'Completed ✅',
};

export default function MyQuotesAndJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, user } = useAuthStore();
  const { quotes, loading: quotesLoading, refresh: refreshQuotes } = useMyQuotes();
  const { jobs, loading: jobsLoading, refresh: refreshJobs } = useMyTradieJobs();
  const [activeTab, setActiveTab] = useState<Tab>('quotes');
  const [chattingId, setChattingId] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const loading = activeTab === 'quotes' ? quotesLoading : jobsLoading;

  async function handleStartChat(id: string, customerId: string, jobId: string) {
    setChattingId(id);
    try {
      const conversationId = await startJobConversation(customerId, user!.id, jobId);
      router.push(`/(tradie)/messages/${conversationId}`);
    } catch {
      Alert.alert('Error', 'Could not start chat. Please try again.');
    } finally {
      setChattingId(null);
    }
  }

  async function handleStartJob(job: Job) {
    Alert.alert(
      'Start Job',
      `Mark "${job.title}" as in progress? The customer will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          onPress: async () => {
            setUpdatingJobId(job.id);
            try {
              await startJob(job.id, user!.id);
              refreshJobs();
            } catch {
              Alert.alert('Error', 'Could not update job status.');
            } finally {
              setUpdatingJobId(null);
            }
          },
        },
      ]
    );
  }

  async function handleCompleteJob(job: Job) {
    Alert.alert(
      'Complete Job',
      `Mark "${job.title}" as complete? The customer will be notified and can release payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Job',
          onPress: async () => {
            setUpdatingJobId(job.id);
            try {
              await completeJob(job.id, user!.id);
              refreshJobs();
            } catch {
              Alert.alert('Error', 'Could not update job status.');
            } finally {
              setUpdatingJobId(null);
            }
          },
        },
      ]
    );
  }

  function handleUpdateJob(job: Job) {
    if (job.status === 'accepted') {
      handleStartJob(job);
    } else if (job.status === 'in_progress') {
      handleCompleteJob(job);
    }
  }

  useFocusEffect(useCallback(() => {
    refreshQuotes();
    refreshJobs();
  }, [refreshQuotes, refreshJobs]));

  function renderQuoteCard(q: Quote) {
    const cat = TRADE_CATEGORIES.find((c) => c.value === q.job?.category);
    const statusStyle = STATUS_COLOR[q.status] ?? STATUS_COLOR.pending;
    return (
      <View
        key={q.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: q.status === 'accepted' ? Brand.primary : colors.border }]}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.quoteNumber, { color: Brand.secondary }]}>{q.quote_number ?? '—'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {STATUS_LABEL[q.status] ?? q.status}
            </Text>
          </View>
        </View>

        <View style={styles.jobRow}>
          {cat && <Text style={styles.catIcon}>{cat.icon}</Text>}
          <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
            {q.job?.title ?? 'Job'}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.amount, { color: colors.text }]}>R{q.amount.toLocaleString()}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
          </Text>
        </View>

        {q.timeline_days && (
          <Text style={[styles.timeline, { color: colors.textSecondary }]}>
            ⏱ {q.timeline_days} day{q.timeline_days !== 1 ? 's' : ''} estimated
          </Text>
        )}

        {q.quote_document_url && (
          <Text style={[styles.docNote, { color: Brand.secondary }]}>📎 Quote document attached</Text>
        )}

        {q.status === 'accepted' && (
          <View style={styles.acceptedActions}>
            <Pressable
              style={styles.chatBtn}
              onPress={() => handleStartChat(q.id, q.job?.customer_id!, q.job_id)}
              disabled={chattingId === q.id}
            >
              {chattingId === q.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.chatBtnText}>💬 Start Chat</Text>
              }
            </Pressable>
            <Pressable
              style={[styles.outlineBtn, { borderColor: Brand.secondary }]}
              onPress={() => router.push(`/(tradie)/active-jobs/${q.job_id}`)}
            >
              <Text style={[styles.outlineBtnText, { color: Brand.secondary }]}>View Job →</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  function renderJobCard(job: Job) {
    const cat = TRADE_CATEGORIES.find((c) => c.value === job.category);
    const statusStyle = JOB_STATUS_COLOR[job.status] ?? JOB_STATUS_COLOR.accepted;
    const isUpdating = updatingJobId === job.id;
    const canUpdate = job.status === 'accepted' || job.status === 'in_progress';

    return (
      <View
        key={job.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: Brand.primary }]}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.quoteNumber, { color: Brand.secondary }]}>{job.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {JOB_STATUS_LABEL[job.status] ?? job.status}
            </Text>
          </View>
        </View>

        <View style={styles.jobRow}>
          {cat && <Text style={styles.catIcon}>{cat.icon}</Text>}
          <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>
            {job.description}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            📍 {job.suburb ?? job.address_text ?? 'No location'}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
          </Text>
        </View>

        {job.scheduled_at && (
          <Text style={[styles.timeline, { color: colors.textSecondary }]}>
            📅 Scheduled: {new Date(job.scheduled_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}

        <View style={styles.acceptedActions}>
          <Pressable
            style={styles.chatBtn}
            onPress={() => handleStartChat(job.id, job.customer_id, job.id)}
            disabled={chattingId === job.id}
          >
            {chattingId === job.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.chatBtnText}>💬 Open Chat</Text>
            }
          </Pressable>
          {canUpdate && (
            <Pressable
              style={[styles.outlineBtn, { borderColor: Brand.secondary, opacity: isUpdating ? 0.5 : 1 }]}
              onPress={() => handleUpdateJob(job)}
              disabled={isUpdating}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color={Brand.secondary} />
                : <Text style={[styles.outlineBtnText, { color: Brand.secondary }]}>
                    {job.status === 'accepted' ? '▶️ Start Job' : '✅ Complete Job'}
                  </Text>
              }
            </Pressable>
          )}
        </View>

        {(job.status === 'completed' || job.status === 'pending_completion') && user && (
          <View style={styles.acceptedActions}>
            <ReviewRequestButton jobId={job.id} tradieId={user.id} customerId={job.customer_id} />
          </View>
        )}
      </View>
    );
  }

  const quotesCount = quotes.length;
  const jobsCount = jobs.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>My Jobs</Text>
          <Text style={styles.bannerSub}>
            {activeTab === 'quotes'
              ? `${quotesCount} quote${quotesCount !== 1 ? 's' : ''} submitted`
              : `${jobsCount} active job${jobsCount !== 1 ? 's' : ''}`
            }
          </Text>
        </View>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={40} color="#38BDF8" />
      </View>

      {/* Sub-tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'quotes' && styles.tabActive]}
          onPress={() => setActiveTab('quotes')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'quotes' ? Brand.primary : colors.textSecondary },
          ]}>
            My Quotes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'jobs' ? Brand.primary : colors.textSecondary },
          ]}>
            My Jobs
          </Text>
        </Pressable>
      </View>

      {loading && (activeTab === 'quotes' ? quotes.length === 0 : jobs.length === 0) ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : activeTab === 'quotes' && quotes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No quotes yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Browse nearby jobs and submit quotes to start winning work.
          </Text>
        </View>
      ) : activeTab === 'jobs' && jobs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔨</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active jobs</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Jobs will appear here once your quotes are accepted and dates are confirmed.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={activeTab === 'quotes' ? refreshQuotes : refreshJobs}
              tintColor={Brand.primary}
            />
          }
        >
          {activeTab === 'quotes'
            ? quotes.map(renderQuoteCard)
            : jobs.map(renderJobCard)
          }
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bannerText: { gap: 4 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Brand.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteNumber: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { fontSize: 18 },
  jobTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 20, fontWeight: '900' },
  locationText: { fontSize: 13, flex: 1 },
  date: { fontSize: 12 },
  timeline: { fontSize: 12 },
  docNote: { fontSize: 12, fontWeight: '600' },
  acceptedActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chatBtn: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
});
