import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Please describe your job in more detail'),
});

type FormData = z.infer<typeof schema>;

// Shared in-memory job draft (passes between steps via global state)
export let jobDraft: {
  title?: string;
  description?: string;
  category?: TradeCategory;
  budgetMin?: number;
  budgetMax?: number;
  aiImageUrl?: string;
  locationLat?: number;
  locationLng?: number;
  addressText?: string;
  suburb?: string;
  province?: string;
} = {};

export default function PostJobDetailsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [category, setCategory] = useState<TradeCategory | null>(
    (jobDraft.category as TradeCategory) ?? null
  );

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: jobDraft.title ?? '',
      description: jobDraft.description ?? '',
    },
  });

  function onSubmit(data: FormData) {
    if (!category) return;
    jobDraft = {
      ...jobDraft,
      title: data.title,
      description: data.description,
      category,
    };
    router.push('/(customer)/post-job/ai-image');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={4} current={1} />

        <Text style={[styles.title, { color: colors.text }]}>Describe your job</Text>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Trade category *</Text>
        <View style={styles.categories}>
          {TRADE_CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: isSelected ? Brand.primary : colors.border,
                    backgroundColor: isSelected ? Brand.primaryLight : colors.surface,
                  },
                ]}
              >
                <Text style={styles.chipIcon}>{cat.icon}</Text>
                <Text style={[styles.chipLabel, { color: isSelected ? Brand.primaryDark : colors.text }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!category && <Text style={[styles.catError, { color: colors.error }]}>Select a category</Text>}

        <View style={styles.form}>
          <Controller control={control} name="title" render={({ field }) => (
            <Input label="Job title *" placeholder="e.g. Fix leaking kitchen tap" error={errors.title?.message} onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="description" render={({ field }) => (
            <Input label="Description *" placeholder="Describe exactly what needs to be done..." multiline numberOfLines={5} textAlignVertical="top" style={{ minHeight: 110 }} error={errors.description?.message} onChangeText={field.onChange} value={field.value} />
          )} />

          <Button size="lg" onPress={handleSubmit(onSubmit)} disabled={!category}>
            Continue →
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12, flexGrow: 1 },
  back: { marginBottom: 4 },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipIcon: { fontSize: 18 },
  chipLabel: { fontSize: 14, fontWeight: '500' },
  catError: { fontSize: 12, marginTop: -4 },
  form: { gap: 14 },
});
