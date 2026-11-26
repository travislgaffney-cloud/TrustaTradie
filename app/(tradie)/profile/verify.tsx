import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  startVerificationCheckout, submitVerificationAppeal, useTradieVerification,
} from '@/hooks/use-tradie-verification';
import { useAuthStore } from '@/store/auth-store';

WebBrowser.maybeCompleteAuthSession();

const VERIFICATION_FEE = 99;

export default function GetVerifiedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile } = useAuthStore();
  const { verification, loading, refresh } = useTradieVerification(profile?.id);

  const [idNumber, setIdNumber] = useState('');
  const [cipcNumber, setCipcNumber] = useState(tradieProfile?.cipc_number ?? '');
  const [appealNote, setAppealNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAlreadyVerified = tradieProfile?.is_verified || tradieProfile?.gold_verified;
  const status = verification?.status;

  useEffect(() => {
    if (status === 'paid' || status === 'checking') {
      pollRef.current = setInterval(refresh, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handlePay() {
    if (!/^\d{13}$/.test(idNumber)) {
      setError('Enter a valid 13-digit SA ID number');
      return;
    }
    if (!cipcNumber.trim()) {
      setError('Enter your CIPC registration number');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { redirectUrl } = await startVerificationCheckout(idNumber, cipcNumber);
      await refresh();
      if (redirectUrl) {
        await WebBrowser.openAuthSessionAsync(redirectUrl, 'trustatradie://verification/return');
      }
      await refresh();
    } catch (err) {
      Alert.alert('Could not start payment', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAppeal() {
    if (!verification) return;
    if (!appealNote.trim()) {
      setError('Tell us a bit about what might have gone wrong');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitVerificationAppeal(verification.id, appealNote.trim());
      await refresh();
    } catch (err) {
      Alert.alert('Could not submit appeal', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ActivityIndicator /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
          </Pressable>

          <Text style={[styles.title, { color: colors.text }]}>Get Verified</Text>

          {isAlreadyVerified ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>✓</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>You&apos;re Verified</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                Your ID, CIPC registration, and bank account have all been independently checked.
              </Text>
            </View>
          ) : status === 'passed' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>✓</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>You&apos;re Verified!</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                All checks passed. Your Verified badge is now live on your profile.
              </Text>
            </View>
          ) : status === 'paid' || status === 'checking' ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={Brand.primary} />
              <Text style={[styles.statusTitle, { color: colors.text, marginTop: 12 }]}>Checking your details…</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                This usually takes a few seconds. Don&apos;t close the app.
              </Text>
            </View>
          ) : status === 'pending_payment' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>⏳</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Payment in progress</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                Complete your payment in the browser window. If you closed it by mistake, this will clear
                automatically in about 30 minutes so you can try again.
              </Text>
              <Button variant="secondary" onPress={refresh}>Check again</Button>
            </View>
          ) : status === 'appealed' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>🕐</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Appeal under review</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                Our team is manually reviewing your case. We&apos;ll notify you once a decision is made.
              </Text>
            </View>
          ) : status === 'appeal_rejected' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>✕</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Appeal not approved</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                Contact support if you believe this is a mistake.
              </Text>
            </View>
          ) : status === 'failed' ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>✕</Text>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Verification didn&apos;t pass</Text>
              <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
                One or more checks didn&apos;t come back clean. The fee isn&apos;t refunded, but you can appeal
                for a manual review — tell us anything that might help (e.g. a recent name change, a new
                bank account, an ID document discrepancy).
              </Text>
              <TextInput
                style={[styles.appealInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="What might have gone wrong?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                value={appealNote}
                onChangeText={setAppealNote}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <Button loading={submitting} onPress={handleAppeal}>Submit Appeal</Button>
            </View>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                For a once-off R{VERIFICATION_FEE} fee, we automatically verify your ID, CIPC registration,
                and bank account. Verified tradies get a trust badge and appear first in search results.
              </Text>

              <Input
                label="SA ID number"
                keyboardType="number-pad"
                maxLength={13}
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder="13-digit ID number"
              />
              <Input
                label="CIPC registration number"
                value={cipcNumber}
                onChangeText={setCipcNumber}
                placeholder="Your CIPC registration number"
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button size="lg" loading={submitting} onPress={handlePay}>
                Pay R{VERIFICATION_FEE} & Get Verified
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, flexGrow: 1, gap: 14 },
  back: { marginBottom: 8 },
  backText: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  statusCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  statusIcon: { fontSize: 48 },
  statusTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  statusBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 8 },
  appealInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    width: '100%',
  },
  errorText: { color: '#991b1b', fontSize: 13 },
});
