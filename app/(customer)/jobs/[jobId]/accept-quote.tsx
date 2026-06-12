import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EscrowTimeline } from '@/components/payments/escrow-timeline';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PLATFORM_FEE } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*, tradie:profiles!quotes_tradie_id_fkey(*), tradie_profile:tradie_profiles(*)')
      .eq('id', quoteId)
      .single<Quote>()
      .then(({ data }) => { setQuote(data ?? null); setLoading(false); });
  }, [quoteId]);

  async function handleAcceptAndPay() {
    if (!quote || !user) return;
    setAccepting(true);

    // 1. Accept the quote in DB
    await acceptQuote(quoteId, jobId);

    // 2. Create a payment record
    const fee = quote.amount * PLATFORM_FEE;
    const payout = quote.amount - fee;

    const { data: payment } = await supabase.from('payments').insert({
      job_id: jobId,
      quote_id: quoteId,
      customer_id: user.id,
      tradie_id: quote.tradie_id,
      amount_total: quote.amount,
      platform_fee: fee,
      tradie_payout: payout,
      status: 'pending',
    }).select().single();

    setAccepting(false);

    // 3. Navigate to PayFast checkout
    if (payment) {
      router.push(`/(customer)/payments/checkout?paymentId=${payment.id}`);
    }
  }

  if (loading) return <LoadingSpinner full />;
  if (!quote) return null;

  const fee = quote.amount * PLATFORM_FEE;

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
            <Avatar uri={quote.tradie?.avatar_url} name={quote.tradie?.full_name} size={56} />
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
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Service fee (5%)</Text>
            <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>Included</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: '700' }]}>You pay</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>R{quote.amount.toLocaleString()}</Text>
          </View>
          <Text style={[styles.feeNote, { color: colors.textSecondary }]}>
            Trust-a-Tradie retains R{fee.toFixed(2)} (5%) as a service fee. The tradie receives R{(quote.amount - fee).toFixed(2)} when the job is complete.
          </Text>
        </Card>

        {/* Escrow explanation */}
        <Card style={styles.escrowCard}>
          <Text style={[styles.escrowTitle, { color: colors.text }]}>🔒 How escrow works</Text>
          <EscrowTimeline status="pending" />
        </Card>

        <Button size="lg" loading={accepting} onPress={handleAcceptAndPay}>
          Pay R{quote.amount.toLocaleString()} Securely →
        </Button>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          Payment is processed securely by PayFast. Funds are held until you confirm the job is complete.
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
