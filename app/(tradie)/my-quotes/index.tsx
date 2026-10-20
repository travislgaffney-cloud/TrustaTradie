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
import { DateTimePickerModal } from '@/components/ui/date-time-picker-modal';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteQuote, useMyQuotes } from '@/hooks/use-quotes';
import { useMyTradieJobs, startJob, completeJob } from '@/hooks/use-jobs';
import { useMySiteVisits, type SiteVisit } from '@/hooks/use-site-visits';
import { startJobConversation } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';
import { ReviewRequestButton } from '@/components/jobs/review-request-button';
import { ShareCompletedJob } from '@/components/jobs/share-completed-job';
import { InvoicePrompt } from '@/components/invoices/invoice-prompt';
import type { Quote, Job } from '@/types/database';

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
  const { profile, tradieProfile, user } = useAuthStore();
  const { quotes, loading: quotesLoading, refresh: refreshQuotes } = useMyQuotes();
  const { jobs, loading: jobsLoading, refresh: refreshJobs } = useMyTradieJobs();
  const { visits: siteVisits, loading: visitsLoading, refresh: refreshVisits } = useMySiteVisits();
  const [chattingId, setChattingId] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [startingJob, setStartingJob] = useState<Job | null>(null);
  const [invoiceJob, setInvoiceJob] = useState<Job | null>(null);
  const [jobTab, setJobTab] = useState<'active' | 'completed'>('active');

  const loading = quotesLoading || jobsLoading || visitsLoading;

  // A site visit only belongs in "yet to quote" until this tradie submits a quote for that job
  const quotedJobIds = new Set(quotes.map((q) => q.job_id));
  const siteVisitsToQuote = siteVisits.filter((v) => !quotedJobIds.has(v.job_id));
  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const rejectedQuotes = quotes.filter((q) => q.status === 'rejected');

  function refreshAll() {
    refreshQuotes();
    refreshJobs();
    refreshVisits();
  }

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

  function handleStartJob(job: Job) {
    setStartingJob(job);
  }

  async function handleConfirmStartJob(date: Date) {
    if (!startingJob) return;
    const job = startingJob;
    setUpdatingJobId(job.id);
    try {
      await startJob(job.id, user!.id, date);
      refreshJobs();
    } catch {
      Alert.alert('Error', 'Could not book a start date for this job.');
    } finally {
      setUpdatingJobId(null);
      setStartingJob(null);
    }
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
            } catch (err) {
              Alert.alert('Could not complete job', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            } finally {
              setUpdatingJobId(null);
            }
          },
        },
      ]
    );
  }

  function handleDeleteQuote(quoteId: string) {
    Alert.alert(
      'Remove quote',
      'This will remove the job card from your list. You can no longer act on it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuote(quoteId);
              refreshQuotes();
            } catch (err) {
              Alert.alert('Could not remove', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
    refreshVisits();
  }, [refreshQuotes, refreshJobs, refreshVisits]));

  function renderSiteVisitCard(v: SiteVisit) {
    const cat = TRADE_CATEGORIES.find((c) => c.value === v.job?.category);
    const date = new Date(v.proposed_datetime).toLocaleDateString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    return (
      <View
        key={v.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardTop}>
          <View style={styles.jobRow}>
            {cat && <Text style={styles.catIcon}>{cat.icon}</Text>}
            <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
              {v.job?.title ?? 'Job'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: v.status === 'confirmed' ? '#dcfce7' : '#fef9c3' }]}>
            <Text style={[styles.statusText, { color: v.status === 'confirmed' ? '#166534' : '#854d0e' }]}>
              {v.status === 'confirmed' ? 'Visit Confirmed' : 'Visit Proposed'}
            </Text>
          </View>
        </View>

        <Text style={[styles.timeline, { color: colors.textSecondary }]}>📅 {date}</Text>
        {v.job?.suburb && (
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>📍 {v.job.suburb}</Text>
        )}

        <Pressable
          style={[styles.outlineBtn, { borderColor: Brand.secondary, marginTop: 4 }]}
          onPress={() => router.push(`/(tradie)/jobs/${v.job_id}/submit-quote`)}
        >
          <Text style={[styles.outlineBtnText, { color: Brand.secondary }]}>📝 Submit Quote →</Text>
        </Pressable>
      </View>
    );
  }

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

        {q.status === 'rejected' && (
          <Pressable style={[styles.outlineBtn, { borderColor: '#ef4444' }]} onPress={() => handleDeleteQuote(q.id)}>
            <Text style={[styles.outlineBtnText, { color: '#ef4444' }]}>🗑 Remove</Text>
          </Pressable>
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
                    {job.status === 'accepted' ? '📅 Start Job' : '✅ Complete Job'}
                  </Text>
              }
            </Pressable>
          )}
        </View>

        {(job.status === 'completed' || job.status === 'pending_completion') && user && (
          <View style={styles.completedActions}>
            <ReviewRequestButton jobId={job.id} tradieId={user.id} customerId={job.customer_id} />
            <Pressable
              style={[styles.invoiceBtn, { backgroundColor: '#dbeafe' }]}
              onPress={() => setInvoiceJob(job)}
            >
              <Text style={[styles.invoiceBtnText, { color: '#1e40af' }]}>🧾 Send Invoice</Text>
            </Pressable>
          </View>
        )}

        {job.status === 'completed' && (
          <ShareCompletedJob job={job} role="tradie" onPhotoAdded={refreshJobs} />
        )}
      </View>
    );
  }

  const activeJobs = jobs.filter((j) => j.status !== 'completed');
  const completedJobsList = jobs.filter((j) => j.status === 'completed');
  const totalCount = siteVisitsToQuote.length + pendingQuotes.length + activeJobs.length + completedJobsList.length;
  const isEmpty = !loading && totalCount === 0 && rejectedQuotes.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>My Jobs</Text>
          <Text style={styles.bannerSub}>
            {totalCount} active item{totalCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Avatar
          uri={profile?.avatar_url}
          name={profile?.full_name}
          size={40}
          color="#38BDF8"
          verified={tradieProfile?.gold_verified ? 'gold' : tradieProfile?.is_verified}
        />
      </View>

      {loading && totalCount === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔨</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing on the go yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Browse nearby jobs to book a site visit or submit a quote — everything you're working on will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={Brand.primary} />
          }
        >
          {siteVisitsToQuote.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>📅 Site Visit Booked</Text>
              {siteVisitsToQuote.map(renderSiteVisitCard)}
            </>
          )}
          {pendingQuotes.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>📝 Quote Submitted</Text>
              {pendingQuotes.map(renderQuoteCard)}
            </>
          )}
          {(activeJobs.length > 0 || completedJobsList.length > 0) && (
            <>
              <View style={[styles.jobTabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  style={[styles.jobTabBtn, jobTab === 'active' && { backgroundColor: Brand.primary }]}
                  onPress={() => setJobTab('active')}
                >
                  <Text style={[styles.jobTabText, { color: jobTab === 'active' ? '#fff' : colors.textSecondary }]}>
                    🔨 Active ({activeJobs.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.jobTabBtn, jobTab === 'completed' && { backgroundColor: Brand.primary }]}
                  onPress={() => setJobTab('completed')}
                >
                  <Text style={[styles.jobTabText, { color: jobTab === 'completed' ? '#fff' : colors.textSecondary }]}>
                    ✅ Completed ({completedJobsList.length})
                  </Text>
                </Pressable>
              </View>
              {jobTab === 'active' ? (
                activeJobs.length > 0 ? (
                  activeJobs.map(renderJobCard)
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 20, textAlign: 'center' }]}>
                    No active jobs right now.
                  </Text>
                )
              ) : completedJobsList.length > 0 ? (
                completedJobsList.map(renderJobCard)
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 20, textAlign: 'center' }]}>
                  No completed jobs yet.
                </Text>
              )}
            </>
          )}
          {rejectedQuotes.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>❌ Unsuccessful</Text>
              {rejectedQuotes.map(renderQuoteCard)}
            </>
          )}
        </ScrollView>
      )}
      {invoiceJob && user && (
        <InvoicePrompt
          visible={!!invoiceJob}
          onClose={() => setInvoiceJob(null)}
          jobId={invoiceJob.id}
          tradieId={user.id}
          customerId={invoiceJob.customer_id}
          jobTitle={invoiceJob.title}
        />
      )}

      <DateTimePickerModal
        visible={!!startingJob}
        onClose={() => setStartingJob(null)}
        onConfirm={handleConfirmStartJob}
      />
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
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  jobTabBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4, marginTop: 4 },
  jobTabBtn: { flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center' },
  jobTabText: { fontSize: 13, fontWeight: '700' },
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
  completedActions: { gap: 8 },
  invoiceBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  invoiceBtnText: { fontSize: 14, fontWeight: '700' },
});
