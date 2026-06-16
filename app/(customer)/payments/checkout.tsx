import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildPayFastUrl } from '@/lib/payfast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Payment } from '@/types/database';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export default function CheckoutScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile } = useAuthStore();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    supabase
      .from('payments')
      .select('*, job:jobs(title)')
      .eq('id', paymentId)
      .single<Payment>()
      .then(({ data }) => { setPayment(data ?? null); setLoading(false); });
  }, [paymentId]);

  async function handlePay() {
    if (!payment || !profile) return;
    setOpening(true);

    const notifyUrl = `${SUPABASE_URL}/functions/v1/payfast-itn`;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const url = await buildPayFastUrl({
      paymentId: payment.id,
      amountRands: payment.amount_total,
      itemName: `Trust-a-Tradie: ${(payment.job as unknown as Record<string, unknown>)?.title ?? 'Job Payment'}`,
      customerName: profile.full_name,
      customerEmail: authUser?.email ?? '',
      notifyUrl,
    });

    const result = await WebBrowser.openAuthSessionAsync(url, 'trustatradie://payment');
    setOpening(false);

    if (result.type === 'success' || result.type === 'dismiss') {
      router.replace(`/(customer)/payments/${paymentId}`);
    }
  }

  if (loading) return <LoadingSpinner full />;
  if (!payment) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={styles.icon}>💳</Text>
        <Text style={[styles.title, { color: colors.text }]}>Secure Payment</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          You will be redirected to PayFast to complete your payment securely.
        </Text>

        <View style={[styles.amount, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to pay</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            R{payment.amount_total.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.safetyNote, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
          <Text style={styles.safetyText}>
            🔒 Your payment is held securely in escrow until you confirm the job is complete. You are protected by Trust-a-Tradie's escrow guarantee.
          </Text>
        </View>

        <Button size="lg" loading={opening} onPress={handlePay}>
          Pay R{payment.amount_total.toLocaleString()} via PayFast
        </Button>

        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  amount: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: { fontSize: 13 },
  amountValue: { fontSize: 36, fontWeight: '900' },
  safetyNote: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  safetyText: { fontSize: 13, color: '#166534', lineHeight: 18, textAlign: 'center' },
});
