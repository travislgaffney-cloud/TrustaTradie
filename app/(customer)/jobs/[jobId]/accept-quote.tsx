import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EscrowTimeline } from '@/components/payments/escrow-timeline';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PLATFORM_FEE } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCommissionPct } from '@/hooks/use-platform-settings';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Quote } from '@/types/database';
import { acceptQuote } from '@/hooks/use-quotes';

export default function AcceptQuoteScreen() {
  const { jobId, quoteId } = useLocalSearchParams<{ jobId: string; quoteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile } = useAuthStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [commissionPct, setCommissionPct] = useState(PLATFORM_FEE);

  function load() {
    // tradie_profiles has no direct FK from quotes — it only reaches profiles,
    // so it has to be nested inside the profiles embed, not a sibling of it
    // (a bare top-level `tradie_profiles(*)` here 400s on every single quote,
    // which silently produced a blank screen since the error wasn't checked).
    supabase
      .from('quotes')
      .select('*, tradie:profiles!quotes_tradie_id_fkey(*, tradie_profiles(*))')
      .eq('id', quoteId)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('[AcceptQuote] fetch error:', error.message); setQuote(null); setLoading(false); return; }
        const q = data as any;
        if (q) q.tradie_profile = q.tradie?.tradie_profiles ?? null;
        setQuote((q as Quote) ?? null);
        setLoading(false);
      });
    getCommissionPct().then(setCommissionPct);
  }

  useEffect(load, [quoteId]);
  useRefreshOnFocus(load);

  async function handleAcceptAndPay() {
    if (!quote || !user) return;
    setAccepting(true);

    try {
      // Accepts the quote and creates the internal transaction ledger row (status 'accepted').
      // Funds aren't marked as held until the customer actually pays on the next screen.
      await acceptQuote(quoteId, jobId);
      router.push(`/(customer)/jobs/${jobId}/pay`);
    } catch (err) {
      Alert.alert(
        'Could not accept quote',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <LoadingSpinner full />;
  if (!quote) return null;

  const fee = quote.amount * commissionPct;
  const feePctLabel = (commissionPct * 100).toFixed(0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Accept Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tradie summary */}
        <Card elevated style={styles.tradieCard}>
          <View style={styles.tradieRow}>
            <Avatar
              uri={quote.tradie?.avatar_url}
              name={quote.tradie?.full_name}
              size={56}
              verified={quote.tradie_profile?.gold_verified ? 'gold' : quote.tradie_profile?.is_verified}
            />
            <View style={styles.tradieInfo}>
              <Text style={[styles.tradieName, { color: colors.text }]}>{quote.tradie?.full_name}</Text>
              {quote.tradie_profile && (
                <Text style={[styles.tradieStats, { color: colors.textSecondary }]}>
                  ⭐ {quote.tradie_profile.average_rating.toFixed(1)} · {quote.tradie_profile.completed_jobs} jobs completed
                </Text>
              )}
            </View>
          </View>
          {quote.message && (
            <Text style={[styles.quoteMessage, { color: colors.textSecondary }]}>
              "{quote.message}"
            </Text>
          )}
          {quote.timeline_days && (
            <Text style={[styles.timeline, { color: colors.textSecondary }]}>
              ⏱ Estimated {quote.timeline_days} days to complete
            </Text>
          )}
        </Card>

        {/* Payment breakdown */}
        <Card style={styles.breakdown}>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>Payment Summary</Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Quote amount</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>R{quote.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Service fee ({feePctLabel}%)</Text>
            <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>Included</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: '700' }]}>You pay</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>R{quote.amount.toLocaleString()}</Text>
          </View>
          <Text style={[styles.feeNote, { color: colors.textSecondary }]}>
            Trust-a-Tradie retains R{fee.toFixed(2)} ({feePctLabel}%) as a service fee. The tradie receives R{(quote.amount - fee).toFixed(2)} when the job is complete.
          </Text>
        </Card>

        {/* Escrow explanation */}
        <Card style={styles.escrowCard}>
          <Text style={[styles.escrowTitle, { color: colors.text }]}>🔒 How escrow works</Text>
          <EscrowTimeline status="accepted" />
        </Card>

        <Button size="lg" loading={accepting} onPress={handleAcceptAndPay}>
          Accept & Continue to Payment →
        </Button>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          Payment is processed securely via TradeSafe. Funds are held in escrow until you confirm the job is complete.
        </Text>
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
  scroll: { padding: 16, gap: 14 },
  tradieCard: { gap: 10 },
  tradieRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tradieInfo: { flex: 1, gap: 4 },
  tradieName: { fontSize: 17, fontWeight: '700' },
  tradieStats: { fontSize: 13 },
  quoteMessage: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  timeline: { fontSize: 13 },
  breakdown: { gap: 10 },
  breakdownTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 4 },
  totalAmount: { fontSize: 20, fontWeight: '800' },
  feeNote: { fontSize: 12, lineHeight: 16 },
  escrowCard: { gap: 12 },
  escrowTitle: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
