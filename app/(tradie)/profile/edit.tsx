import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Colors, Brand } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  bio: z.string().optional(),
  yearsExperience: z.string().optional(),
  hourlyRate: z.string().optional(),
  serviceRadius: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile, tradieProfile, setProfile, setTradieProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TradeCategory[]>(tradieProfile?.categories ?? []);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      bio: profile?.bio ?? '',
      yearsExperience: tradieProfile?.years_experience?.toString() ?? '',
      hourlyRate: tradieProfile?.hourly_rate?.toString() ?? '',
      serviceRadius: tradieProfile?.service_radius_km?.toString() ?? '50',
    },
  });

  function toggleCat(cat: TradeCategory) {
    setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    setLoading(true);

    const [{ data: updatedProfile }, { data: updatedTP }] = await Promise.all([
      supabase.from('profiles').update({
        full_name: data.fullName,
        phone: data.phone || null,
        bio: data.bio || null,
      }).eq('id', user.id).select().single(),
      supabase.from('tradie_profiles').update({
        categories,
        years_experience: data.yearsExperience ? Number(data.yearsExperience) : null,
        hourly_rate: data.hourlyRate ? Number(data.hourlyRate) : null,
        service_radius_km: data.serviceRadius ? Number(data.serviceRadius) : 50,
      }).eq('id', user.id).select().single(),
    ]);

    if (updatedProfile) setProfile(updatedProfile);
    if (updatedTP) setTradieProfile(updatedTP);

    setLoading(false);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Controller control={control} name="fullName" render={({ field }) => (
            <Input label="Full name" error={errors.fullName?.message} onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="phone" render={({ field }) => (
            <Input label="Phone number" keyboardType="phone-pad" onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="bio" render={({ field }) => (
            <Input label="Bio" multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 90 }} placeholder="Tell customers about yourself and your work..." onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="yearsExperience" render={({ field }) => (
            <Input label="Years of experience" keyboardType="numeric" onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="hourlyRate" render={({ field }) => (
            <Input label="Hourly rate (R, optional)" keyboardType="numeric" onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="serviceRadius" render={({ field }) => (
            <Input label="Service radius (km)" keyboardType="numeric" hint="Max distance to travel for jobs" onChangeText={field.onChange} value={field.value} />
          )} />

          <Text style={[styles.catLabel, { color: colors.text }]}>Trade categories</Text>
          <View style={styles.categories}>
            {TRADE_CATEGORIES.map((cat) => {
              const sel = categories.includes(cat.value);
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => toggleCat(cat.value)}
                  style={[styles.chip, { borderColor: sel ? Brand.primary : colors.border, backgroundColor: sel ? Brand.primaryLight : colors.surface }]}
                >
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                  <Text style={[styles.chipLabel, { color: sel ? Brand.primaryDark : colors.text }]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>Save Changes</Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, flexGrow: 1 },
  form: { gap: 14 },
  catLabel: { fontSize: 14, fontWeight: '600' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  chipIcon: { fontSize: 18 },
  chipLabel: { fontSize: 14, fontWeight: '500' },
});
