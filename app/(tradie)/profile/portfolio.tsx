import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePortfolioImages } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import { uploadFile, deleteFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';
import { PortfolioGrid } from '@/components/tradie/portfolio-grid';

export default function PortfolioScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { images, loading, refresh } = usePortfolioImages();
  const [uploading, setUploading] = useState(false);

  async function handleAddImage() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsMultipleSelection: true });
    if (result.canceled) return;
    setUploading(true);
    for (const asset of result.assets) {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const url = await uploadFile('portfolio', path, asset.uri, `image/${ext}`);
      await supabase.from('portfolio_images').insert({
        tradie_id: user.id,
        url,
        sort_order: images.length,
      });
    }
    await refresh();
    setUploading(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Portfolio</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Button loading={uploading} onPress={handleAddImage}>
          📸 Add Photos
        </Button>

        {loading ? <LoadingSpinner /> : <PortfolioGrid images={images} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14 },
});
