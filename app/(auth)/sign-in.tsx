import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
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
import {
  BiometricPrompt,
  saveBiometricCredentials,
} from '@/components/auth/biometric-prompt';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function SignInScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    setUnconfirmedEmail(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      if (authError.code === 'email_not_confirmed') {
        setUnconfirmedEmail(data.email);
      } else {
        setError(authError.message);
      }
    } else {
      await saveBiometricCredentials(data.email, data.password);

      // With email confirmation on, this is the first time a signed-up-but-
      // not-yet-onboarded user gets a session — signUp() itself no longer
      // hands one out until they've confirmed. If onboarding never finished
      // (they confirmed but never came back to set location before), resume
      // it here rather than leaving them stuck with an authenticated session
      // and nowhere to go. Mirrors GoogleSignInButton's same check.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single();
        if (!profile?.onboarding_complete) {
          router.replace('/(auth)/sign-up-location');
        }
      }
    }
    setLoading(false);
  }

  async function handleResend() {
    if (!unconfirmedEmail) return;
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: unconfirmedEmail });
    setResending(false);
    setError(resendError ? resendError.message : 'Confirmation email resent — check your inbox.');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
          </Pressable>

          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your Trust-a-Tradie account
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  label="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  onChangeText={field.onChange}
                  value={field.value}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input
                  label="Password"
                  secureTextEntry
                  autoComplete="password"
                  error={errors.password?.message}
                  onChangeText={field.onChange}
                  value={field.value}
                />
              )}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.tint }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            {unconfirmedEmail && (
              <View style={[styles.errorBox, { backgroundColor: '#fffbeb' }]}>
                <Text style={[styles.errorText, { color: '#92400e' }]}>
                  Your email isn't confirmed yet. Check your inbox for the confirmation link, or resend it below.
                </Text>
                <Pressable onPress={handleResend} disabled={resending} style={styles.resendLink}>
                  <Text style={[styles.resendText, { color: colors.tint }]}>
                    {resending ? 'Sending…' : 'Resend confirmation email'}
                  </Text>
                </Pressable>
              </View>
            )}

            {error && (
              <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.errorText, { color: '#991b1b' }]}>{error}</Text>
              </View>
            )}

            <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>
              Sign In
            </Button>

            <BiometricPrompt
              onSuccess={async (email, password) => {
                setLoading(true);
                await supabase.auth.signInWithPassword({ email, password });
                setLoading(false);
              }}
              onSkip={() => {}}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <GoogleSignInButton />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.tint }]}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  form: { gap: 14 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 14, fontWeight: '500' },
  errorBox: { borderRadius: 8, padding: 12 },
  errorText: { fontSize: 14 },
  resendLink: { marginTop: 8 },
  resendText: { fontSize: 14, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '600' },
});
