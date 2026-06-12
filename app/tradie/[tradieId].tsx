import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePortfolioImages, useTradieDocuments, useTradieRatings } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import type { Profile, TradieProfile, Rating } from '@/types/database';
import { PortfolioGrid } from '@/components/tradie/portfolio-grid';
import { RatingStars } from '@/components/tradie/rating-stars';

export default function PublicTradieProfileScreen() {
  const { tradieId } = useLocalSearchParams<{ tradieId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tradieProfile, setTradieProfile] = useState<TradieProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { images } = usePortfolioImages(tradieId);
  const { ratings } = useTradieRatings(tradieId);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').eq('id', tradieId).single<Profile>(),
      supabase.from('tradie_profiles').select('*').eq('id', tradieId).single<TradieProfile>(),
    ]).then(([{ data: p }, { data: tp }]) => {
      setProfile(p ?? null);
      setTradieProfile(tp ?? null);
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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#F97316' }]}>
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

        <View style={styles.content}>
          {/* Categories */}
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

          {/* Document badges (no file access — just labels) */}
          {tradieProfile.is_verified && (
            <View style={[styles.verifiedBox, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
              <Text style={styles.verifiedText}>
                ✅ Qualifications verified by Trust-a-Tradie admin
              </Text>
            </View>
          )}

          {/* Portfolio */}
          {images.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Portfolio</Text>
              <PortfolioGrid images={images} />
            </>
          )}

          {/* Ratings */}
          {ratings.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
              {ratings.slice(0, 5).map((r) => (
                <Card key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Avatar uri={r.customer?.avatar_url} name={r.customer?.full_name} size={32} />
                    <Text style={[styles.reviewName, { color: colors.text }]}>{r.customer?.full_name ?? 'Customer'}</Text>
                    <RatingStars rating={r.score} size={14} />
                  </View>
                  {r.comment && (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{r.comment}</Text>
                  )}
                </Card>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  headerInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  stats: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  content: { padding: 16, gap: 14 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bio: { fontSize: 15, lineHeight: 22 },
  verifiedBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  verifiedText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  reviewCard: { gap: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { fontSize: 14, fontWeight: '600', flex: 1 },
  reviewComment: { fontSize: 13, lineHeight: 18 },
});
