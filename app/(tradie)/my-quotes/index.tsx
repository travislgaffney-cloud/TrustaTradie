import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyQuotes } from '@/hooks/use-quotes';

const STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'outline',
} as const;

export default function MyQuotesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { quotes, loading, refresh } = useMyQuotes();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Quotes</Text>
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : quotes.length === 0 ? (
        <EmptyState icon="📝" title="No quotes yet" description="Browse nearby jobs and submit quotes to start winning work." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        >
          {quotes.map((q) => {
            const cat = TRADE_CATEGORIES.find((c) => c.value === q.job?.category);
            return (
              <Pressable key={q.id} onPress={() => q.status === 'accepted' ? router.push(`/(tradie)/active-jobs/${q.job_id}`) : undefined}>
                <Card elevated style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      {cat && <Text style={styles.catIcon}>{cat.icon}</Text>}
                      <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                        {q.job?.title ?? 'Job'}
                      </Text>
                    </View>
                    <Badge label={q.status.charAt(0).toUpperCase() + q.status.slice(1)} variant={STATUS_VARIANT[q.status]} />
                  </View>
                  <View style={styles.details}>
                    <Text style={[styles.amount, { color: colors.text }]}>R{q.amount.toLocaleString()}</Text>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>
                      {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                  {q.status === 'accepted' && (
                    <Text style={styles.acceptedNote}>✅ Accepted! Tap to view job →</Text>
                  )}
                </Card>
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
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  scroll: { padding: 16, gap: 12 },
  card: { gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  catIcon: { fontSize: 18 },
  jobTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  details: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: '800' },
  date: { fontSize: 12 },
  acceptedNote: { fontSize: 13, color: '#166534', fontWeight: '600' },
});
