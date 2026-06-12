import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserTypeSelector } from '@/components/auth/user-type-selector';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SignUpScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [userType, setUserType] = useState<'customer' | 'tradie' | null>(null);

  function handleContinue() {
    if (!userType) return;
    if (userType === 'customer') {
      router.push('/(auth)/sign-up-customer');
    } else {
      router.push('/(auth)/sign-up-tradie');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          How will you use Trust-a-Tradie?
        </Text>

        <UserTypeSelector value={userType} onChange={setUserType} />

        <View style={styles.footer}>
          <Button
            size="lg"
            disabled={!userType}
            onPress={handleContinue}
          >
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, gap: 16 },
  back: { marginBottom: 8 },
  backText: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  footer: { marginTop: 'auto', paddingTop: 24 },
});
