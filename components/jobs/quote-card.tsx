import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Quote } from '@/types/database';
import { RatingStars } from '@/components/tradie/rating-stars';

interface QuoteCardProps {
  quote: Quote;
  onAccept?: () => void;
  onViewProfile?: () => void;
  onPress?: () => void;
  isAccepted?: boolean;
}

const STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'outline',
} as const;

export function QuoteCard({ quote, onAccept, onViewProfile, onPress, isAccepted }: QuoteCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed && onPress ? 0.85 : 1 }]}>
    <Card elevated style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={onViewProfile} style={styles.tradie}>
          <Avatar uri={quote.tradie?.avatar_url} name={quote.tradie?.full_name} size={48} />
          <View style={styles.tradieInfo}>
            <Text style={[styles.tradieName, { color: colors.text }]}>
              {quote.tradie?.full_name ?? 'Unknown Tradie'}
            </Text>
            {quote.tradie_profile && (
              <RatingStars rating={quote.tradie_profile.average_rating} size={14} />
            )}
            {quote.tradie_profile && (
              <Text style={[styles.reviews, { color: colors.textSecondary }]}>
                {quote.tradie_profile.total_reviews} reviews · {quote.tradie_profile.completed_jobs} jobs
              </Text>
            )}
          </View>
        </Pressable>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.text }]}>
            R{quote.amount.toLocaleString()}
          </Text>
          <Text style={[styles.vat, { color: colors.textSecondary }]}>
            {quote.includes_vat ? 'incl. VAT' : 'excl. VAT'}
          </Text>
          <Badge label={quote.status.charAt(0).toUpperCase() + quote.status.slice(1)} variant={STATUS_VARIANT[quote.status]} />
        </View>
      </View>

      {quote.message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          "{quote.message}"
        </Text>
      )}

      {quote.timeline_days != null && (
        <Text style={[styles.timeline, { color: colors.textSecondary }]}>
          ⏱ Estimated {quote.timeline_days} day{quote.timeline_days !== 1 ? 's' : ''}
        </Text>
      )}

      {quote.status === 'pending' && onAccept && !isAccepted && (
        <Pressable onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>Accept this quote →</Text>
        </Pressable>
      )}

      {onPress && (
        <Text style={[styles.detailsHint, { color: colors.textSecondary }]}>
          Tap to view full details {quote.quote_document_url ? '· 📎 attachment' : ''}
        </Text>
      )}
    </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tradie: { flexDirection: 'row', gap: 10, flex: 1 },
  tradieInfo: { flex: 1, gap: 2 },
  tradieName: { fontSize: 15, fontWeight: '600' },
  reviews: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 20, fontWeight: '800' },
  vat: { fontSize: 11 },
  message: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  timeline: { fontSize: 13 },
  acceptBtn: {
    backgroundColor: '#f97316',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  detailsHint: { fontSize: 11, textAlign: 'right', marginTop: 2 },
});
