import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { ensureTransactionForJob } from '@/hooks/use-transactions';
import { extractFunctionErrorMessage } from '@/lib/edge-function-error';
import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

type PaymentMethod = 'EFT' | 'OZOW';

interface BankingDetails {
  name: string;
  number: string;
  branch: string;
  type: string;
  reference: string;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: string; blurb: string }[] = [
  { value: 'EFT', label: 'Bank Transfer (EFT)', icon: '🏦', blurb: 'Pay from your bank app or online banking. Takes 1–2 days to confirm.' },
  { value: 'OZOW', label: 'Ozow', icon: '⚡', blurb: 'Instant payment via your bank login.' },
];

// Real TradeSafe checkout. handlePay() calls the tradesafe-checkout edge
// function (creates buyer/seller/agent tokens as needed, creates the
// TradeSafe transaction, and initiates a deposit for the chosen method).
// EFT has no redirect at all — TradeSafe returns bank details + a reference
// to show the customer, and funds_held only arrives later via the
// tradesafe-webhook function once TradeSafe confirms they've received the
// transfer. Ozow opens a hosted paymentLink like a card checkout would.
// Neither method confirms instantly — this screen never assumes it did.
export default function TradeSafePayScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('EFT');
  const [paying, setPaying] = useState(false);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, [jobId]);

  useRefreshOnFocus(load);

  function load() {
    setLoading(true);
    setLoadError(null);
    ensureTransactionForJob(jobId)
      .then(setTxn)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load payment details.'))
      .finally(() => setLoading(false));
  }

  async function handlePay() {
    if (!txn) return;
    setPaying(true);

    try {
      const { data, error } = await supabase.functions.invoke('tradesafe-checkout', {
        body: { jobId, method },
      });

      if (error || data?.error) {
        throw new Error(await extractFunctionErrorMessage(error, data?.error ?? 'Could not start checkout'));
      }

      if (data.method === 'EFT') {
        setBankingDetails(data.bankingDetails);
        return;
      }

      if (!data.paymentLink) throw new Error('Could not start checkout');

      const redirectUri = 'trustatradie://payment/success';
      const result = await WebBrowser.openAuthSessionAsync(data.paymentLink, redirectUri);

      if (result.type === 'success' && result.url) {
        router.replace(result.url.replace('trustatradie://', '/'));
      } else {
        // Customer closed the browser without completing — the funds_held
        // transition (if any) still arrives via the webhook independently.
        router.replace(`/(customer)/jobs/${jobId}`);
      }
    } catch (err) {
      Alert.alert('Payment failed', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  async function handleCopyReference() {
    if (!bankingDetails) return;
    await Clipboard.setStringAsync(bankingDetails.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <LoadingSpinner full />;

  if (loadError || !txn) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={[styles.title, { color: colors.text }]}>Couldn't load payment</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loadError ?? 'Something went wrong loading this payment.'}
          </Text>
          <Button size="lg" onPress={load}>Try Again</Button>
          <Button variant="ghost" onPress={() => router.back()}>Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (bankingDetails) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.icon}>🏦</Text>
          <Text style={[styles.title, { color: colors.text }]}>Transfer to this account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Use your bank app or online banking to pay R{txn.quoted_amount.toLocaleString()} to the account below.
            {'\n\n'}You must use the exact reference shown, or TradeSafe won't be able to match your payment.
          </Text>

          <View style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { label: 'Bank', value: bankingDetails.name },
              { label: 'Account number', value: bankingDetails.number },
              { label: 'Branch code', value: bankingDetails.branch },
              { label: 'Account type', value: bankingDetails.type },
            ].map((row) => (
              <View key={row.label} style={styles.bankRow}>
                <Text style={[styles.bankLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.bankValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            ))}

            <View style={[styles.referenceBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.bankLabel, { color: colors.textSecondary }]}>Payment reference (required)</Text>
              <Text style={[styles.referenceValue, { color: colors.text }]}>{bankingDetails.reference}</Text>
            </View>

            <Pressable onPress={handleCopyReference} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : '📋 Copy Reference'}</Text>
            </Pressable>
          </View>

          <View style={[styles.pendingNote, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
            <Text style={styles.pendingNoteText}>
              ⏳ We'll hold this as pending until TradeSafe confirms your transfer — this can take 1–2 business days for EFT. You'll be notified once funds are in escrow.
            </Text>
          </View>

          <Button variant="ghost" onPress={() => router.replace(`/(customer)/jobs/${jobId}`)}>
            Back to Job
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={[styles.title, { color: colors.text }]}>Pay via TradeSafe</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          TradeSafe holds your payment securely in escrow until the job is confirmed complete.
        </Text>

        <View style={[styles.amount, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount to pay</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            R{txn.quoted_amount.toLocaleString()}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Payment method</Text>
        <View style={styles.methodList}>
          {METHOD_OPTIONS.map((opt) => {
            const selected = method === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setMethod(opt.value)}
                style={[
                  styles.methodCard,
                  { backgroundColor: colors.surface, borderColor: selected ? Colors[scheme].tint : colors.border },
                  selected && styles.methodCardSelected,
                ]}
              >
                <Text style={styles.methodIcon}>{opt.icon}</Text>
                <View style={styles.methodText}>
                  <Text style={[styles.methodLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.methodBlurb, { color: colors.textSecondary }]}>{opt.blurb}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selected ? Colors[scheme].tint : colors.border }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: Colors[scheme].tint }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button size="lg" loading={paying} onPress={handlePay}>
          Pay R{txn.quoted_amount.toLocaleString()} via {method === 'EFT' ? 'EFT' : 'Ozow'}
        </Button>

        <Button variant="ghost" onPress={() => router.back()}>
          Cancel
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
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
  sectionLabel: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '700', marginTop: 4 },
  methodList: { width: '100%', gap: 10 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  methodCardSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  methodIcon: { fontSize: 26 },
  methodText: { flex: 1, gap: 2 },
  methodLabel: { fontSize: 15, fontWeight: '700' },
  methodBlurb: { fontSize: 12, lineHeight: 16 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  bankCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bankLabel: { fontSize: 13 },
  bankValue: { fontSize: 14, fontWeight: '700' },
  referenceBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  referenceValue: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  copyBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copyBtnText: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  pendingNote: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  pendingNoteText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
});
