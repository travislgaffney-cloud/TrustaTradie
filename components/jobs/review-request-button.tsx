import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';
import { useReviewState, sendReviewRequest } from '@/hooks/use-review-requests';

interface Props {
  jobId: string;
  tradieId: string;
  customerId: string;
}

export function ReviewRequestButton({ jobId, tradieId, customerId }: Props) {
  const { hasReview, request, canRequest, loading } = useReviewState(jobId, customerId);
  const [sending, setSending] = useState(false);

  if (loading) return null;

  if (hasReview) {
    return (
      <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
        <Text style={[styles.badgeText, { color: '#166534' }]}>⭐ Review Received</Text>
      </View>
    );
  }

  if (!canRequest) {
    return (
      <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.badgeText, { color: '#64748b' }]}>📩 Review requested ({request?.request_count ?? 0}/2)</Text>
      </View>
    );
  }

  async function handlePress() {
    Alert.alert(
      'Request Review',
      'Send the customer a notification asking them to leave a review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            setSending(true);
            try {
              await sendReviewRequest({ jobId, tradieId, customerId });
              Alert.alert('Sent!', 'Review request sent to the customer.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not send request.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Pressable
      style={[styles.btn, { opacity: sending ? 0.5 : 1 }]}
      onPress={handlePress}
      disabled={sending}
    >
      {sending ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.btnText}>
          ⭐ {request ? 'Remind for Review' : 'Request Review'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  badge: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
});
