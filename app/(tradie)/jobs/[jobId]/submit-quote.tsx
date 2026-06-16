import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLATFORM_FEE } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { submitQuote } from '@/hooks/use-quotes';

const schema = z.object({
  amount: z.string().min(1).refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  message: z.string().min(20, 'Please provide more detail about your approach'),
  timelineDays: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter estimated days'),
});

type FormData = z.infer<typeof schema>;

export default function SubmitQuoteScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [includesVat, setIncludesVat] = useState(true);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = Number(watch('amount') ?? 0);
  const tradiePayout = amount * (1 - PLATFORM_FEE);

  async function onSubmit(data: FormData) {
    if (!user) return;
    setLoading(true);
    try {
      await submitQuote({
        jobId,
        tradieId: user.id,
        amount: Number(data.amount),
        includesVat,
        message: data.message,
        timelineDays: Number(data.timelineDays),
      });
      router.replace('/(tradie)/my-quotes');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Submit Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Controller control={control} name="amount" render={({ field }) => (
            <Input
              label="Quote amount (R) *"
              keyboardType="numeric"
              placeholder="5000"
              error={errors.amount?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          <Pressable onPress={() => setIncludesVat(!includesVat)} style={styles.vatToggle}>
            <View style={[styles.checkbox, includesVat && { backgroundColor: colors.tint, borderColor: colors.tint }]}>
              {includesVat && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.vatLabel, { color: colors.text }]}>Amount includes VAT (15%)</Text>
          </Pressable>

          {amount > 0 && (
            <View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.bLabel, { color: colors.textSecondary }]}>You quoted:</Text>
              <Text style={[styles.bValue, { color: colors.text }]}>R{amount.toLocaleString()}</Text>
              <Text style={[styles.bLabel, { color: colors.textSecondary }]}>Trust-a-Tradie fee (5%):</Text>
              <Text style={[styles.bValue, { color: colors.error }]}>− R{(amount * PLATFORM_FEE).toFixed(2)}</Text>
              <Text style={[styles.bLabel, { color: colors.text, fontWeight: '700' }]}>You receive:</Text>
              <Text style={[styles.bValue, { color: colors.text, fontWeight: '700', fontSize: 18 }]}>R{tradiePayout.toFixed(2)}</Text>
            </View>
          )}

          <Controller control={control} name="message" render={({ field }) => (
            <Input
              label="Message to customer *"
              placeholder="Describe your approach, materials you'll use, and why you're the right person for this job..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 110 }}
              error={errors.message?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          <Controller control={control} name="timelineDays" render={({ field }) => (
            <Input
              label="Estimated days to complete *"
              keyboardType="numeric"
              placeholder="3"
              error={errors.timelineDays?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>
            Submit Quote
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, flexGrow: 1 },
  form: { gap: 14 },
  vatToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  vatLabel: { fontSize: 14 },
  breakdown: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bLabel: { fontSize: 13, width: '60%' },
  bValue: { fontSize: 14, width: '38%', textAlign: 'right' },
});
