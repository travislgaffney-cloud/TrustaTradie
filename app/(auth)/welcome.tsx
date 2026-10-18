import { Link } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppleSignInButton } from '@/components/auth/apple-sign-in-button';
import { FacebookSignInButton } from '@/components/auth/facebook-sign-in-button';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PRIVACY_POLICY_URL = 'https://admin-five-chi-53.vercel.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://admin-five-chi-53.vercel.app/terms';

export default function WelcomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: Brand.secondary }]}>
          <Text style={styles.heroEmoji}>🔨</Text>
          <Text style={styles.heroTitle}>Trust-a-Tradie</Text>
          <Text style={styles.heroSubtitle}>
            South Africa's trusted marketplace for home services
          </Text>
        </View>

        {/* Auth actions */}
        <View style={styles.actions}>
          <AppleSignInButton />
          <GoogleSignInButton />
          <FacebookSignInButton />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Link href="/(auth)/sign-up" asChild>
            <Button size="lg">Create an account</Button>
          </Link>

          <Link href="/(auth)/sign-in" asChild>
            <Button variant="outline" size="lg">Sign in</Button>
          </Link>

          <Text style={[styles.terms, { color: colors.textSecondary }]}>
            By continuing, you agree to our{' '}
            <Text
              style={[styles.termsLink, { color: Brand.primary }]}
              onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={[styles.termsLink, { color: Brand.primary }]}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
