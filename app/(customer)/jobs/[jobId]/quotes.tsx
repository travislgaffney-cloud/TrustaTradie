import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuoteCard } from '@/components/jobs/quote-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { useJobQuotes } from '@/hooks/use-quotes';

export default function CustomerQuotesScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job } = useJob(jobId);
  const { quotes, loading, refresh } = useJobQuotes(jobId);

  useFocusEffect(useCallback(() => { refresh(); }, []));

  const hasAccepted = quotes.some((q) => q.status === 'accepted');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          Quotes ({quotes.length})
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : quotes.length === 0 ? (
        <EmptyState icon="💬" title="No quotes yet" description="Tradies will be notified of your job. Check back soon." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Brand.primary} />}
        >
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {hasAccepted ? 'A quote has been accepted.' : 'Tap a quote to accept it and proceed to payment.'}
          </Text>
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isAccepted={hasAccepted}
              onPress={() => router.push(`/(customer)/jobs/${jobId}/quote/${quote.id}` as never)}
              onViewProfile={() => router.push(`/tradie/${quote.tradie_id}` as never)}
              onAccept={() => router.push(`/(customer)/jobs/${jobId}/accept-quote?quoteId=${quote.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
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
  scroll: { padding: 16, gap: 12 },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
});
