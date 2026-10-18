import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Landing pad for the trustatradie://payment/failure deep link — distinct from
// /payment/cancel: TradeSafe's transactionDeposit takes separate `failure`
// (the deposit attempt itself errored, e.g. card declined) and `cancel`
// (the buyer backed out) redirect URLs. See app/payment/success.tsx for how
// this screen gets reached via the https bounce page.
export default function PaymentFailureScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (jobId) {
        router.replace(`/(customer)/jobs/${jobId}/pay`);
      } else {
        router.replace('/(customer)/jobs');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [jobId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={[styles.title, { color: colors.text }]}>Payment failed</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Something went wrong processing your payment. No funds were taken — you can try again.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  icon: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 15, textAlign: 'center' },
});
