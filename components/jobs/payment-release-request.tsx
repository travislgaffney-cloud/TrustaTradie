import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
  getActiveReleaseRequest,
  getPaymentReleaseHours,
  getReleaseEligibility,
  requestPaymentRelease,
} from '@/hooks/use-payment-release';
import type { PaymentReleaseRequest } from '@/types/database';

interface Props {
  jobId: string;
  jobTitle: string;
  tradieId: string;
  completionMarkedAt: string | null;
}

// Shown on the tradie's active-job screen while a job sits at
// pending_completion — the countdown, the request button once eligible,
// and whatever the latest request's own state is (pending / declined, with
// its note). Once admin releases, the job moves off pending_completion
// entirely, so there's no "released" state to render here.
export function PaymentReleaseRequestPanel({ jobId, jobTitle, tradieId, completionMarkedAt }: Props) {
  const [releaseHours, setReleaseHours] = useState<number | null>(null);
  const [activeRequest, setActiveRequest] = useState<PaymentReleaseRequest | null>(null);
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, [jobId]);

  async function load() {
    const [hours, request] = await Promise.all([getPaymentReleaseHours(), getActiveReleaseRequest(jobId)]);
    setReleaseHours(hours);
    setActiveRequest(request);
    setLoaded(true);
  }

  function handleRequestPress() {
    Alert.alert(
      'Request Payment Release',
      "This asks admin to review the job and release payment without the customer's confirmation. Only do this if the job is genuinely done.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Release', onPress: handleRequest },
      ]
    );
  }

  async function handleRequest() {
    setSubmitting(true);
    try {
      await requestPaymentRelease(jobId, tradieId, jobTitle);
      await load();
    } catch (err) {
      Alert.alert('Could not submit request', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded || releaseHours === null || !completionMarkedAt) return null;

  if (activeRequest?.status === 'pending') {
    return (
      <View style={[styles.box, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
        <Text style={styles.text}>📨 Request sent — awaiting admin review.</Text>
      </View>
    );
  }

  const { eligible, availableAt } = getReleaseEligibility(completionMarkedAt, releaseHours, now);

  if (!eligible) {
    return (
      <View style={[styles.box, { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]}>
        <Text style={[styles.text, { color: '#4b5563' }]}>⏱️ Available to request in {formatRemaining(availableAt, now)}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {activeRequest?.status === 'declined' && (
        <View style={[styles.box, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Text style={[styles.text, { color: '#991b1b' }]}>
            Your last request was declined{activeRequest.decision_note ? `: ${activeRequest.decision_note}` : '.'}
          </Text>
        </View>
      )}
      <Button variant="secondary" loading={submitting} onPress={handleRequestPress}>
        📨 Request Payment Release
      </Button>
    </View>
  );
}

function formatRemaining(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours <= 1) return 'under an hour';
  if (hours < 24) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, borderWidth: 1, padding: 14 },
  text: { fontSize: 13, lineHeight: 18 },
});
