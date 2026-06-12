import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'trustatradie://reset-password',
    });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.sentContainer}>
          <Text style={styles.sentIcon}>📧</Text>
          <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We've sent a password reset link to your email address.
          </Text>
          <Button onPress={() => router.replace('/(auth)/sign-in')}>Back to sign in</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a reset link.
          </Text>
          <View style={styles.form}>
            <Controller control={control} name="email" render={({ field }) => (
              <Input label="Email address" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} onChangeText={field.onChange} value={field.value} />
            )} />
            <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>
              Send reset link
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
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  form: { gap: 14, marginTop: 8 },
  sentContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  sentIcon: { fontSize: 56 },
});
