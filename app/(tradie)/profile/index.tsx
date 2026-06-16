import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';
import { RatingStars } from '@/components/tradie/rating-stars';

export default function TradieProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile, setProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !profile) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const url = await uploadFile('avatars', `${profile.id}.${ext}`, asset.uri, `image/${ext}`);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: url });
    } catch {
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
      <View style={[styles.banner, { backgroundColor: Brand.secondary }]} />
      <Pressable style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: '#ef4444', marginTop: 32 }]} onPress={handleSignOut}>
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

        {/* Navy header banner */}
        <View style={[styles.banner, { backgroundColor: Brand.secondary }]}>
          <Pressable onPress={handleAvatarChange} disabled={uploading} style={styles.avatarWrap}>
            <Avatar uri={profile.avatar_url} name={profile.full_name} size={88} />
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.photoLabel}>Change photo</Text>
            }
          </Pressable>
          <View style={styles.bannerInfo}>
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
            {categories.length > 0 && (
              <View style={styles.categories}>
                {categories.map((cat) => cat && (
                  <Badge key={cat.value} label={`${cat.icon} ${cat.label}`} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Menu */}
        <Card style={styles.menu}>
          <MenuItem icon="✏️" label="Edit Name & Bio" textColor={colors.text} borderColor={colors.border} onPress={() => router.push('/(tradie)/profile/edit')} />
          <MenuItem icon="📄" label="Qualifications & Documents" textColor={colors.text} borderColor={colors.border} onPress={() => router.push('/(tradie)/profile/documents')} border />
          <MenuItem icon="🖼️" label="Previous Work (Portfolio)" textColor={colors.text} borderColor={colors.border} onPress={() => router.push('/(tradie)/profile/portfolio')} border />
          <MenuItem icon="💰" label="Earnings & Bank Details" textColor={colors.text} borderColor={colors.border} onPress={() => router.push('/(tradie)/earnings')} border />
        </Card>

        {/* Sign out */}
        <Pressable
          style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: '#ef4444' }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  border = false,
  textColor,
  borderColor,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  border?: boolean;
  textColor: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuItem, border && { borderTopWidth: 1, borderTopColor: borderColor }]}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuText, { color: textColor }]}>{label}</Text>
      <Text style={[styles.arrow, { color: borderColor }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, gap: 16, paddingBottom: 32 },
  banner: {
    padding: 20,
    gap: 16,
  },
  avatarWrap: { alignItems: 'center', gap: 6 },
  photoLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  bannerInfo: { gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  stats: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  menu: { padding: 0, marginHorizontal: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuText: { flex: 1, fontSize: 15, fontWeight: '500' },
  arrow: { fontSize: 22 },
  signOutBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
