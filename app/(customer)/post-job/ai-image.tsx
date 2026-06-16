import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { jobDraft } from './details';

export default function PostJobAttachImageScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [imageUri, setImageUri] = useState<string | null>(
    (jobDraft as { aiImageUrl?: string }).aiImageUrl ?? null
  );

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      jobDraft.aiImageUrl = result.assets[0].uri;
    }
  }

  async function handleLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      jobDraft.aiImageUrl = result.assets[0].uri;
    }
  }

  function handleNext() {
    router.push('/(customer)/post-job/location');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={4} current={2} />

        <Text style={[styles.title, { color: colors.text }]}>Attach an image</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add a photo of the area or job that needs attention. This helps tradies give you a more accurate quote.
        </Text>

        {imageUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <Pressable onPress={() => { setImageUri(null); jobDraft.aiImageUrl = undefined; }}>
              <Text style={[styles.removeText, { color: colors.error }]}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              No photo attached yet
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={handleCamera}
            style={[styles.actionBtn, { backgroundColor: Brand.secondary }]}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>Take Photo</Text>
          </Pressable>

          <Pressable
            onPress={handleLibrary}
            style={[styles.actionBtn, { backgroundColor: Brand.secondary }]}
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionLabel}>Camera Roll</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button size="lg" onPress={handleNext}>
            {imageUri ? 'Continue →' : 'Skip this step →'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16, flexGrow: 1 },
  back: { marginBottom: 4 },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  placeholder: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderIcon: { fontSize: 40 },
  placeholderText: { fontSize: 14 },
  imageWrapper: { gap: 10, alignItems: 'center' },
  image: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  removeText: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 'auto', paddingTop: 8 },
});
