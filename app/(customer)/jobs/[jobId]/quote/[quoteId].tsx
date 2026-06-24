import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { acceptQuote } from '@/hooks/use-quotes';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types/database';

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

export default function QuoteDetailScreen() {
  const { jobId, quoteId } = useLocalSearchParams<{ jobId: string; quoteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    supabase
      .from('quotes')
      .select('*, tradie:profiles!quotes_tradie_id_fkey(*, tradie_profiles(*))')
      .eq('id', quoteId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('[QuoteDetail] fetch error:', error.message);
        const q = data as any;
        if (q) q.tradie_profile = q.tradie?.tradie_profiles ?? null;
        setQuote(q ?? null);
        setLoading(false);
      });
  }, [quoteId]);

  function handleAccept() {
    Alert.alert(
      'Accept Quote',
      `Accept this quote for R${Number(quote!.amount).toLocaleString()}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept', style: 'default', onPress: async () => {
            setAccepting(true);
            try {
              await acceptQuote(quoteId, jobId);
              setQuote((q) => q ? { ...q, status: 'accepted' } : q);
              Alert.alert('Quote Accepted!', 'The tradie has been notified and will be in touch soon.');
            } catch (e: any) {
              console.error('[acceptQuote] error:', e?.message, e);
              Alert.alert('Error', 'Could not accept the quote. Please try again.');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner full />;
  if (!quote) return null;

  const hasAttachment = !!quote.quote_document_url;
  const attachIsImage = hasAttachment && isImageUrl(quote.quote_document_url!);

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending:   { bg: '#fef9c3', text: '#854d0e' },
    accepted:  { bg: '#dcfce7', text: '#166534' },
    rejected:  { bg: '#fee2e2', text: '#991b1b' },
    withdrawn: { bg: '#f1f5f9', text: '#475569' },
  };
  const statusStyle = statusColors[quote.status] ?? statusColors.pending;
  const statusLabel: Record<string, string> = {
    pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Quote Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header: quote number + status */}
        <View style={styles.headerRow}>
          <Text style={[styles.quoteNumber, { color: Brand.secondary }]}>
            {quote.quote_number ?? '—'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusLabel[quote.status] ?? quote.status}
            </Text>
          </View>
        </View>

        {/* Tradie info */}
        <Card elevated style={styles.tradieCard}>
          <Pressable
            style={styles.tradieRow}
            onPress={() => router.push(`/tradie/${quote.tradie_id}` as never)}
          >
            <Avatar uri={quote.tradie?.avatar_url} name={quote.tradie?.full_name} size={52} />
            <View style={styles.tradieInfo}>
              <Text style={[styles.tradieName, { color: colors.text }]}>
                {quote.tradie?.full_name ?? 'Unknown Tradie'}
              </Text>
              {quote.tradie_profile && (
                <Text style={[styles.tradieStats, { color: colors.textSecondary }]}>
                  ⭐ {Number(quote.tradie_profile.average_rating).toFixed(1)} · {quote.tradie_profile.total_reviews} reviews · {quote.tradie_profile.completed_jobs} jobs
                </Text>
              )}
              <Text style={[styles.viewProfile, { color: Brand.primary }]}>View profile →</Text>
            </View>
          </Pressable>
        </Card>

        {/* Quote breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quote Breakdown</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Amount</Text>
            <Text style={[styles.rowValue, { color: colors.text, fontWeight: '800', fontSize: 20 }]}>
              R{Number(quote.amount).toLocaleString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>VAT</Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
              {quote.includes_vat ? 'Included (15%)' : 'Excluded'}
            </Text>
          </View>
          {quote.timeline_days != null && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Timeline</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {quote.timeline_days} day{quote.timeline_days !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </Card>

        {/* Message */}
        {quote.message && (
          <Card style={styles.messageCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Message from Tradie</Text>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              {quote.message}
            </Text>
          </Card>
        )}

        {/* Attachment */}
        {hasAttachment && (
          <Card style={styles.attachCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quote Document</Text>

            {attachIsImage ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(quote.quote_document_url!)}>
                <Image
                  source={{ uri: quote.quote_document_url! }}
                  style={styles.attachImage}
                  resizeMode="contain"
                />
                <Text style={[styles.attachHint, { color: colors.textSecondary }]}>
                  Tap image to open full size
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.docButton, { backgroundColor: Brand.secondary }]}
                onPress={() => WebBrowser.openBrowserAsync(quote.quote_document_url!)}
              >
                <Text style={styles.docButtonIcon}>📄</Text>
                <Text style={styles.docButtonText}>View Quote Document</Text>
              </Pressable>
            )}
          </Card>
        )}

        {/* Accept CTA */}
        {quote.status === 'pending' && (
          <Pressable
            style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.acceptText}>Accept this quote →</Text>
            }
          </Pressable>
        )}

        {quote.status === 'accepted' && (
          <View style={[styles.acceptedBanner]}>
            <Text style={styles.acceptedBannerText}>✅ You accepted this quote</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quoteNumber: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  tradieCard: { gap: 0 },
  tradieRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tradieInfo: { flex: 1, gap: 3 },
  tradieName: { fontSize: 16, fontWeight: '700' },
  tradieStats: { fontSize: 12 },
  viewProfile: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  breakdownCard: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  messageCard: { gap: 8 },
  messageText: { fontSize: 14, lineHeight: 22 },
  attachCard: { gap: 12 },
  attachImage: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#f1f5f9' },
  attachHint: { fontSize: 11, textAlign: 'center', marginTop: 6 },
  docButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 12, paddingVertical: 16,
  },
  docButtonIcon: { fontSize: 22 },
  docButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  acceptBtn: {
    backgroundColor: Brand.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  acceptedBanner: {
    backgroundColor: '#dcfce7', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  acceptedBannerText: { color: '#166534', fontSize: 15, fontWeight: '700' },
});
