import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Landing pad for the trustatradie://payment/success deep link — reached via
// the https bounce page (admin/src/app/payment/success) that TradeSafe
// redirects to after a successful deposit. jobId is a param we control
// ourselves when we build the checkout-initiation call, not something
// TradeSafe sends, so it's safe to rely on.
export default function PaymentSuccessScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(customer)/home');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={[styles.title, { color: colors.text }]}>Payment successful</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your payment is held securely in escrow.
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
