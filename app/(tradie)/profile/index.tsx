import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PortfolioGrid } from '@/components/tradie/portfolio-grid';
import { RatingStars } from '@/components/tradie/rating-stars';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieDocuments, usePortfolioImages, useTradieRatings } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';
import type { TradieDocument } from '@/types/database';

const DOC_ICONS: Record<string, string> = {
  licence: '🪪', insurance: '🛡️', certificate: '📜', other: '📄',
};
const DOC_LABELS: Record<string, string> = {
  licence: 'Licence', insurance: 'Insurance', certificate: 'Certificate', other: 'Document',
};

export default function TradieProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile, setProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const { documents } = useTradieDocuments();
  const { images } = usePortfolioImages();
  const { ratings } = useTradieRatings(profile?.id ?? '');

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !profile) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const url = await uploadFile('avatars', `${profile.id}.${ext}`, asset.uri, `image/${ext}`);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: url });
    } catch (e: any) {
      console.error('[Avatar upload] error:', e?.message, e?.error, e);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
    setUploading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  if (!profile) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: Brand.secondary }]} />
      <Pressable style={[styles.signOutBtn, { borderColor: '#ef4444', marginTop: 32 }]} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );

  const categories = (tradieProfile?.categories ?? [])
    .map((c) => TRADE_CATEGORIES.find((t) => t.value === c))
    .filter(Boolean);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header — same layout as public profile */}
        <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
          <View style={styles.headerBody}>
            <Pressable onPress={handleAvatarChange} disabled={uploading} style={styles.avatarWrap}>
              <Avatar uri={profile.avatar_url} name={profile.full_name} size={80} />
              {uploading
                ? <ActivityIndicator color="#fff" style={styles.photoLabel} />
                : <Text style={styles.photoLabel}>Change photo</Text>
              }
            </Pressable>
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.full_name}</Text>
                {tradieProfile?.is_verified && <Badge label="✓ Verified" variant="success" />}
              </View>
              {tradieProfile && <RatingStars rating={tradieProfile.average_rating} showNumber />}
              {tradieProfile && (
                <Text style={styles.stats}>
                  {tradieProfile.total_reviews} reviews · {tradieProfile.completed_jobs} jobs completed
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>

          {/* Trade categories */}
          {categories.length > 0 && (
            <View style={styles.categories}>
              {categories.map((cat) => cat && (
                <Badge key={cat.value} label={`${cat.icon} ${cat.label}`} />
              ))}
            </View>
          )}

          {/* Bio */}
          {profile.bio ? (
            <Card>
              <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
            </Card>
          ) : (
            <Card style={styles.emptyHint}>
              <Text style={[styles.emptyHintText, { color: colors.textSecondary }]}>
                No bio yet — tap Edit Profile to add one.
              </Text>
            </Card>
          )}

          {/* Experience & rate */}
          {tradieProfile && (tradieProfile.years_experience || tradieProfile.hourly_rate) && (
            <Card style={styles.statsCard}>
              {tradieProfile.years_experience != null && (
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>🔨</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Experience</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {tradieProfile.years_experience} yr{tradieProfile.years_experience !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {tradieProfile.hourly_rate != null && (
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
              {documents.map((doc: TradieDocument) => (
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
                      <View style={[styles.verifiedBadge, { backgroundColor: '#dcfce7' }]}>
                        <Text style={[styles.verifiedText, { color: '#166534' }]}>✅ Verified</Text>
                      </View>
                    ) : (
                      <View style={[styles.verifiedBadge, { backgroundColor: '#fef9c3' }]}>
                        <Text style={[styles.verifiedText, { color: '#854d0e' }]}>⏳ Pending</Text>
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

          {images.length === 0 && documents.length === 0 && ratings.length === 0 && (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Your profile is looking bare — add documents, portfolio images and a bio so customers trust you.
              </Text>
            </Card>
          )}

          {/* Actions */}
          <Pressable
            style={[styles.editBtn, { backgroundColor: Brand.secondary }]}
            onPress={() => router.push('/(tradie)/profile/edit')}
          >
            <Text style={styles.editBtnText}>✏️  Edit Profile</Text>
          </Pressable>

          <Pressable style={[styles.signOutBtn, { borderColor: '#ef4444' }]} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  header: { padding: 20, gap: 12 },
  headerBody: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatarWrap: { alignItems: 'center', gap: 6 },
  photoLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  headerInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  stats: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  content: { padding: 16, gap: 14 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bio: { fontSize: 15, lineHeight: 22 },
  emptyHint: { alignItems: 'center', paddingVertical: 12 },
  emptyHintText: { fontSize: 13, textAlign: 'center' },
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
  verifiedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  reviewCard: { gap: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { fontSize: 14, fontWeight: '600' },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  editBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  signOutBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
