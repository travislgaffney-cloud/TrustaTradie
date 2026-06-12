import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
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
import { supabase } from '@/lib/supabase';

const schema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(10, 'Enter a valid phone number'),
    cipcNumber: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function SignUpTradieScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<TradeCategory[]>([]);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function toggleCategory(cat: TradeCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function onSubmit(data: FormData) {
    if (selectedCategories.length === 0) {
      setError('Select at least one trade category');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: 'tradie',
          cipc_number: data.cipcNumber ?? null,
          categories: selectedCategories,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/(auth)/sign-up-location');
    setLoading(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
          </Pressable>

          <StepIndicator steps={3} current={1} />

          <Text style={[styles.title, { color: colors.text }]}>Tradie details</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Set up your tradie profile
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Your trade(s) — select all that apply
          </Text>
          <View style={styles.categories}>
            {TRADE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.value);
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => toggleCategory(cat.value)}
                  style={[
                    styles.categoryChip,
                    { borderColor: isSelected ? Brand.primary : colors.border, backgroundColor: isSelected ? Brand.primaryLight : colors.surface },
                  ]}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catLabel, { color: isSelected ? Brand.primaryDark : colors.text }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            <Controller control={control} name="fullName" render={({ field }) => (
              <Input label="Full name" error={errors.fullName?.message} onChangeText={field.onChange} value={field.value} />
            )} />
            <Controller control={control} name="email" render={({ field }) => (
              <Input label="Email address" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} onChangeText={field.onChange} value={field.value} />
            )} />
            <Controller control={control} name="phone" render={({ field }) => (
              <Input label="Phone number" keyboardType="phone-pad" error={errors.phone?.message} onChangeText={field.onChange} value={field.value} placeholder="+27 82 000 0000" />
            )} />
            <Controller control={control} name="cipcNumber" render={({ field }) => (
              <Input label="CIPC Registration number (optional)" error={errors.cipcNumber?.message} onChangeText={field.onChange} value={field.value} hint="If you have a registered business" />
            )} />
            <Controller control={control} name="password" render={({ field }) => (
              <Input label="Password" secureTextEntry error={errors.password?.message} onChangeText={field.onChange} value={field.value} />
            )} />
            <Controller control={control} name="confirmPassword" render={({ field }) => (
              <Input label="Confirm password" secureTextEntry error={errors.confirmPassword?.message} onChangeText={field.onChange} value={field.value} />
            )} />

            {error && (
              <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={{ color: '#991b1b' }}>{error}</Text>
              </View>
            )}

            <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>
              Continue
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, gap: 12 },
  back: { marginBottom: 8 },
  backText: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catIcon: { fontSize: 18 },
  catLabel: { fontSize: 14, fontWeight: '500' },
  form: { gap: 14 },
  errorBox: { borderRadius: 8, padding: 12 },
});
