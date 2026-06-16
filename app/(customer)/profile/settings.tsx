import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { clearBiometricCredentials } from '@/components/auth/biometric-prompt';

export default function CustomerSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  async function handleSignOut() {
    await clearBiometricCredentials();
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <Button variant="danger" onPress={handleSignOut}>Sign Out</Button>
        </Card>
        <Text style={[styles.version, { color: colors.textSecondary }]}>Trust-a-Tradie v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 20, gap: 16 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  version: { fontSize: 12, textAlign: 'center' },
});
