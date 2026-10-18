import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Landing pad for the trustatradie://payment/cancel deep link — see
// app/payment/success.tsx for how it gets reached.
export default function PaymentCancelScreen() {
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
        <Text style={styles.icon}>✕</Text>
        <Text style={[styles.title, { color: colors.text }]}>Payment cancelled</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          No funds were taken. You can try again from the job.
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
