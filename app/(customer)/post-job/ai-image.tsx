import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateJobImage } from '@/lib/openai';
import { jobDraft } from './details';

export default function PostJobAIImageScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [prompt, setPrompt] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>((jobDraft as { aiImageUrl?: string }).aiImageUrl ?? null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const url = await generateJobImage(
        `${prompt}. Style: realistic interior/exterior photo, South African home, bright and clear.`,
        'draft'
      );
      setGeneratedUrl(url);
      jobDraft.aiImageUrl = url;
    } catch (_) {
      // handle error gracefully
    } finally {
      setGenerating(false);
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

        <Text style={[styles.title, { color: colors.text }]}>Generate inspiration</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Describe how you'd like the finished result to look. Our AI will generate a concept image to share with tradies.
        </Text>

        <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. Modern tiled bathroom with grey tiles, wall-hung vanity and frameless shower..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={prompt}
            onChangeText={setPrompt}
          />
        </View>

        <Button onPress={handleGenerate} loading={generating} disabled={!prompt.trim() || generating}>
          ✨ Generate Image
        </Button>

        {generating && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Generating your image... this takes ~15 seconds
            </Text>
          </View>
        )}

        {generatedUrl && !generating && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: generatedUrl }} style={styles.image} />
            <Text style={[styles.imageCaption, { color: colors.textSecondary }]}>
              AI-generated concept · This will be shared with tradies
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button size="lg" onPress={handleNext}>
            {generatedUrl ? 'Continue →' : 'Skip this step →'}
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
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
  },
  input: { fontSize: 15, lineHeight: 22, minHeight: 80 },
  loadingBox: { alignItems: 'center', gap: 12, padding: 20 },
  loadingText: { fontSize: 14, textAlign: 'center' },
  imageWrapper: { gap: 8, alignItems: 'center' },
  image: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  imageCaption: { fontSize: 12, textAlign: 'center' },
  footer: { marginTop: 'auto', paddingTop: 16 },
});
