import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePortfolioImages } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';
import { PortfolioGrid } from '@/components/tradie/portfolio-grid';
import { RatingStars } from '@/components/tradie/rating-stars';

export default function TradieProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile, setProfile } = useAuthStore();
  const { images, refresh } = usePortfolioImages();
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !profile) return;
    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const url = await uploadFile('avatars', `${profile.id}.${ext}`, asset.uri, `image/${ext}`);
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    setProfile({ ...profile, avatar_url: url });
    setUploading(false);
  }

  if (!profile || !tradieProfile) return null;

  const categories = tradieProfile.categories
    .map((c) => TRADE_CATEGORIES.find((t) => t.value === c))
    .filter(Boolean);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>

        <Pressable onPress={handleAvatarChange} style={styles.avatarWrapper} disabled={uploading}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={90} />
          <Text style={[styles.changePhoto, { color: colors.tint }]}>
            {uploading ? 'Uploading...' : 'Change photo'}
          </Text>
        </Pressable>

        <Card style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
            {tradieProfile.is_verified && <Badge label="✓ Verified" variant="success" />}
          </View>
          <RatingStars rating={tradieProfile.average_rating} showNumber />
          <Text style={[styles.stats, { color: colors.textSecondary }]}>
            {tradieProfile.total_reviews} reviews · {tradieProfile.completed_jobs} completed jobs
          </Text>
          <View style={styles.categories}>
            {categories.map((cat) => cat && <Badge key={cat.value} label={`${cat.icon} ${cat.label}`} />)}
          </View>
          {profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </Card>

        <Card style={styles.section}>
          <Pressable onPress={() => router.push('/(tradie)/profile/edit')} style={styles.menuItem}>
            <Text style={[styles.menuText, { color: colors.text }]}>✏️ Edit Profile</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tradie)/profile/documents')} style={[styles.menuItem, styles.menuBorder, { borderTopColor: colors.border }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>📄 Qualifications & Documents</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tradie)/earnings')} style={[styles.menuItem, styles.menuBorder, { borderTopColor: colors.border }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>💰 Earnings & Bank Details</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Portfolio</Text>
        <PortfolioGrid images={images} />
        <Button variant="secondary" size="sm" onPress={() => router.push('/(tradie)/profile/portfolio')}>
          + Manage Portfolio
        </Button>

        <Button variant="danger" onPress={() => supabase.auth.signOut()}>Sign Out</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  avatarWrapper: { alignItems: 'center', gap: 8 },
  changePhoto: { fontSize: 14 },
  infoCard: { gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '700' },
  stats: { fontSize: 13 },
  categories: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bio: { fontSize: 14, lineHeight: 20 },
  section: { padding: 0 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuBorder: { borderTopWidth: 1 },
  menuText: { fontSize: 15 },
  arrow: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
});
