import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePortfolioImages, useTradieRatings } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import type { Profile, TradieProfile, TradieDocument } from '@/types/database';
import { PortfolioGrid } from '@/components/tradie/portfolio-grid';
import { RatingStars } from '@/components/tradie/rating-stars';

const DOC_ICONS: Record<string, string> = {
  licence:     '🪪',
  insurance:   '🛡️',
  certificate: '📜',
  other:       '📄',
};

const DOC_LABELS: Record<string, string> = {
  licence:     'Licence',
  insurance:   'Insurance',
  certificate: 'Certificate',
  other:       'Document',
};

export default function PublicTradieProfileScreen() {
  const { tradieId } = useLocalSearchParams<{ tradieId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tradieProfile, setTradieProfile] = useState<TradieProfile | null>(null);
  const [documents, setDocuments] = useState<TradieDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { images } = usePortfolioImages(tradieId);
  const { ratings } = useTradieRatings(tradieId);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').eq('id', tradieId).single<Profile>(),
      supabase.from('tradie_profiles').select('*').eq('id', tradieId).single<TradieProfile>(),
      supabase.from('tradie_documents').select('*').eq('tradie_id', tradieId).order('created_at', { ascending: false }),
    ]).then(([{ data: p }, { data: tp }, { data: docs }]) => {
      setProfile(p ?? null);
      setTradieProfile(tp ?? null);
      setDocuments((docs as TradieDocument[]) ?? []);
      setLoading(false);
    });
  }, [tradieId]);

  if (loading) return <LoadingSpinner full />;
  if (!profile || !tradieProfile) return null;

  const categories = tradieProfile.categories
    .map((c) => TRADE_CATEGORIES.find((t) => t.value === c))
    .filter(Boolean);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header banner */}
        <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <View style={styles.headerBody}>
            <Avatar uri={profile.avatar_url} name={profile.full_name} size={80} />
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.full_name}</Text>
                {tradieProfile.is_verified && <Badge label="✓ Verified" variant="success" />}
              </View>
              <RatingStars rating={tradieProfile.average_rating} showNumber />
              <Text style={styles.stats}>
                {tradieProfile.total_reviews} reviews · {tradieProfile.completed_jobs} jobs completed
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Trade categories */}
          <View style={styles.categories}>
            {categories.map((cat) => cat && (
              <Badge key={cat.value} label={`${cat.icon} ${cat.label}`} />
            ))}
          </View>

          {/* Bio */}
          {profile.bio && (
            <Card>
              <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
            </Card>
          )}

          {/* Experience & rate */}
          {(tradieProfile.years_experience || tradieProfile.hourly_rate) && (
            <Card style={styles.statsCard}>
              {tradieProfile.years_experience && (
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>🔨</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Experience</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {tradieProfile.years_experience} yr{tradieProfile.years_experience !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {tradieProfile.hourly_rate && (
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>💰</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hourly rate</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    R{Number(tradieProfile.hourly_rate).toLocaleString()}/hr
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Qualifications & documents */}
          {documents.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Qualifications & Documents</Text>
              {documents.map((doc) => (
                <Card key={doc.id} style={styles.docCard}>
                  <View style={styles.docRow}>
                    <Text style={styles.docIcon}>{DOC_ICONS[doc.type] ?? '📄'}</Text>
                    <View style={styles.docInfo}>
                      <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                      <Text style={[styles.docType, { color: colors.textSecondary }]}>
                        {DOC_LABELS[doc.type] ?? 'Document'}
                        {doc.expiry_date ? ` · Expires ${doc.expiry_date}` : ''}
                      </Text>
                    </View>
                    {doc.is_verified ? (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
                      </View>
                    ) : (
                      <View style={[styles.verifiedBadge, { backgroundColor: '#fef9c3' }]}>
                        <Text style={[styles.verifiedBadgeText, { color: '#854d0e' }]}>⏳ Pending</Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* Portfolio */}
          {images.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Previous Work</Text>
              <PortfolioGrid images={images} />
            </>
          )}

          {/* Reviews */}
          {ratings.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Customer Reviews ({ratings.length})
              </Text>
              {ratings.slice(0, 5).map((r) => (
                <Card key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Avatar uri={r.customer?.avatar_url} name={r.customer?.full_name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewName, { color: colors.text }]}>
                        {r.customer?.full_name ?? 'Customer'}
                      </Text>
                      <RatingStars rating={r.score} size={13} />
                    </View>
                  </View>
                  {r.comment && (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{r.comment}</Text>
                  )}
                </Card>
              ))}
            </>
          )}

          {images.length === 0 && ratings.length === 0 && documents.length === 0 && (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                This tradie hasn't added portfolio images or documents yet.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  header: { padding: 20, gap: 12 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerBody: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headerInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  stats: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  content: { padding: 16, gap: 14 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bio: { fontSize: 15, lineHeight: 22 },
  statsCard: { gap: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { fontSize: 18, width: 28 },
  statLabel: { flex: 1, fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  docCard: { padding: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIcon: { fontSize: 24 },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { fontSize: 14, fontWeight: '600' },
  docType: { fontSize: 12 },
  verifiedBadge: {
    backgroundColor: '#dcfce7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  reviewCard: { gap: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { fontSize: 14, fontWeight: '600' },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
