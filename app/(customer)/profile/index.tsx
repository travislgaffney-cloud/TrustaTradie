import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, setProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !profile) return;
    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const url = await uploadFile('avatars', `${profile.id}.${ext}`, asset.uri, `image/${ext}`);
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    setProfile({ ...profile, avatar_url: url });
    setUploading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* Avatar */}
        <Pressable onPress={handleAvatarChange} style={styles.avatarWrapper} disabled={uploading}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={90} />
          <Text style={[styles.changePhoto, { color: colors.tint }]}>
            {uploading ? 'Uploading...' : 'Change photo'}
          </Text>
        </Pressable>

        <Card style={styles.infoCard}>
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
          <Text style={[styles.infoLine, { color: colors.textSecondary }]}>
            📍 {profile.address_text ?? 'No location set'}
          </Text>
          {profile.phone && (
            <Text style={[styles.infoLine, { color: colors.textSecondary }]}>
              📞 {profile.phone}
            </Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Pressable onPress={() => router.push('/(customer)/profile/settings')} style={styles.menuItem}>
            <Text style={[styles.menuText, { color: colors.text }]}>⚙️ Settings & Preferences</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        </Card>

        <Button variant="danger" onPress={handleSignOut}>Sign Out</Button>
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
  infoCard: { gap: 8 },
  name: { fontSize: 20, fontWeight: '700' },
  infoLine: { fontSize: 14 },
  section: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuText: { fontSize: 15 },
  menuArrow: { fontSize: 20 },
});
