import { useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React, { useCallback } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyQuotes } from '@/hooks/use-quotes';
import { useAuthStore } from '@/store/auth-store';
import { router } from 'expo-router';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  accepted:  { bg: '#dcfce7', text: '#166534' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
  withdrawn: { bg: '#f1f5f9', text: '#475569' },
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted ✅',
  rejected:  'Rejected',
  withdrawn: 'Withdrawn',
};

export default function MyQuotesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const { quotes, loading, refresh } = useMyQuotes();

  // Refresh every time the tab is focused so new quotes appear immediately
  useFocusEffect(useCallback(() => { refresh(); }, []));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Navy banner */}
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>My Quotes</Text>
          <Text style={styles.bannerSub}>
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''} submitted
          </Text>
        </View>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={40} color="#38BDF8" />
      </View>

      {loading && quotes.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : quotes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No quotes yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Browse nearby jobs and submit quotes to start winning work.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Brand.primary} />}
        >
          {quotes.map((q) => {
            const cat = TRADE_CATEGORIES.find((c) => c.value === q.job?.category);
            const statusStyle = STATUS_COLOR[q.status] ?? STATUS_COLOR.pending;
            return (
              <Pressable
                key={q.id}
                onPress={() => q.status === 'accepted' ? router.push(`/(tradie)/active-jobs/${q.job_id}`) : undefined}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: q.status === 'accepted' ? Brand.primary : colors.border }]}
              >
                {/* Quote number */}
                <View style={styles.cardTop}>
                  <Text style={[styles.quoteNumber, { color: Brand.secondary }]}>{q.quote_number ?? '—'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </Text>
                  </View>
                </View>

                {/* Job title */}
                <View style={styles.jobRow}>
                  {cat && <Text style={styles.catIcon}>{cat.icon}</Text>}
                  <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                    {q.job?.title ?? 'Job'}
                  </Text>
                </View>

                {/* Amount + date */}
                <View style={styles.metaRow}>
                  <Text style={[styles.amount, { color: colors.text }]}>R{q.amount.toLocaleString()}</Text>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </Text>
                </View>

                {/* Timeline */}
                {q.timeline_days && (
                  <Text style={[styles.timeline, { color: colors.textSecondary }]}>
                    ⏱ {q.timeline_days} day{q.timeline_days !== 1 ? 's' : ''} estimated
                  </Text>
                )}

                {/* Document attached */}
                {q.quote_document_url && (
                  <Text style={[styles.docNote, { color: Brand.secondary }]}>📎 Quote document attached</Text>
                )}

                {q.status === 'accepted' && (
                  <Text style={styles.acceptedCta}>Tap to view active job →</Text>
                )}
              </Pressable>
            );
          })}
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
  quoteNumber: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { fontSize: 18 },
  jobTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 20, fontWeight: '900' },
  date: { fontSize: 12 },
  timeline: { fontSize: 12 },
  docNote: { fontSize: 12, fontWeight: '600' },
  acceptedCta: { fontSize: 13, color: '#166534', fontWeight: '600' },
});
