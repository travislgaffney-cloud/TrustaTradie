import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

// Reached right after signUp() when Supabase returns no session — meaning
// email confirmation is required before the account can sign in. Confirming
// happens via the link in that email (opened in the browser, handled by
// Supabase directly); this screen doesn't need to catch a deep link back,
// the user just returns here and signs in normally afterwards.
export default function ConfirmEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);

    if (error) {
      Alert.alert('Could not resend', error.message);
    } else {
      Alert.alert('Email sent', `We've sent another confirmation link to ${email}.`);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={styles.icon}>📬</Text>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We've sent a confirmation link to{'\n'}
          <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>.
          {'\n\n'}Tap the link to verify your account, then come back and sign in.
        </Text>

        <Button size="lg" loading={resending} onPress={handleResend}>
          Resend Email
        </Button>

        <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={styles.signInLink}>
          <Text style={[styles.signInText, { color: colors.tint }]}>Back to Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  signInLink: { marginTop: 8, padding: 8 },
  signInText: { fontSize: 15, fontWeight: '600' },
});
