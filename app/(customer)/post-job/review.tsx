import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createJob } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import { jobDraft } from './details';

export default function PostJobReviewScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const draft = jobDraft;
  const category = TRADE_CATEGORIES.find((c) => c.value === draft.category);

  async function handlePost() {
    if (!user || !draft.category) return;
    setLoading(true);
    try {
      const job = await createJob({
        customerId: user.id,
        title: draft.title ?? '',
        description: draft.description ?? '',
        category: draft.category!,
        addressText: draft.addressText ?? '',
        suburb: draft.suburb ?? '',
        province: draft.province ?? '',
        lat: draft.locationLat ?? -26.2041,
        lng: draft.locationLng ?? 28.0473,
        budgetMin: draft.budgetMin,
        budgetMax: draft.budgetMax,
      });

      // Attach AI image if generated
      if (draft.aiImageUrl && job.id) {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('job_images').insert({
          job_id: job.id,
          url: draft.aiImageUrl,
          is_ai: true,
          sort_order: 0,
        });
      }

      // Clear draft
      Object.keys(jobDraft).forEach((k) => delete (jobDraft as Record<string, unknown>)[k]);

      router.replace(`/(customer)/jobs/${job.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={4} current={4} />

        <Text style={[styles.title, { color: colors.text }]}>Review your job</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Check everything looks correct before posting.
        </Text>

        <Card elevated style={styles.card}>
          {draft.aiImageUrl && (
            <Image source={{ uri: draft.aiImageUrl }} style={styles.image} />
          )}

          <View style={styles.row}>
            {category && <Text style={styles.catBadge}>{category.icon} {category.label}</Text>}
          </View>

          <Text style={[styles.jobTitle, { color: colors.text }]}>{draft.title}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{draft.description}</Text>

          {(draft.budgetMin || draft.budgetMax) && (
            <Text style={[styles.budget, { color: colors.textSecondary }]}>
              {`💰 Budget: R${draft.budgetMin?.toLocaleString() ?? '?'}${draft.budgetMax ? ` – R${draft.budgetMax.toLocaleString()}` : '+'}`}
            </Text>
          )}

          <Text style={[styles.location, { color: colors.textSecondary }]}>
            📍 {draft.addressText || 'Location not set'}
          </Text>
        </Card>

        <View style={[styles.escrowNote, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}>
          <Text style={styles.escrowTitle}>🔒 Trust-a-Tradie Escrow Protection</Text>
          <Text style={styles.escrowText}>
            When you accept a quote, you pay the full amount securely to Trust-a-Tradie. We only release payment to the tradie once you confirm the job is complete. Our 5% service fee covers this protection.
          </Text>
        </View>

        <Button size="lg" loading={loading} onPress={handlePost}>
          🚀 Post Job
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 14, flexGrow: 1 },
  back: { marginBottom: 4 },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { padding: 0, gap: 0, overflow: 'hidden' },
  image: { width: '100%', height: 180, resizeMode: 'cover' },
  row: { flexDirection: 'row', padding: 14, paddingBottom: 8 },
  catBadge: {
    backgroundColor: '#FED7AA',
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jobTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 14 },
  desc: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14 },
  budget: { fontSize: 13, paddingHorizontal: 14 },
  location: { fontSize: 13, paddingHorizontal: 14, paddingBottom: 14 },
  escrowNote: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  escrowTitle: { fontSize: 14, fontWeight: '700', color: '#713f12' },
  escrowText: { fontSize: 13, color: '#713f12', lineHeight: 18 },
});
