import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TownSelector } from '@/components/tradie/town-selector';
import { Button } from '@/components/ui/button';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Profile, TradieProfile } from '@/types/database';

// Geolocation-based matching is parked for now (see hooks/use-location.ts,
// hooks/use-nearby-tradies.ts, hooks/use-jobs.ts's useNearbyJobs — all left
// intact, just unused). Customers no longer set a profile-level address at
// all; they'll type the job site address per job instead. Tradies pick the
// towns they service here, which is what job-matching filters on now.
export default function SignUpLocationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { setProfile, profile, setTradieProfile } = useAuthStore();
  const isTradie = profile?.role === 'tradie';
  const [loading, setLoading] = useState(false);
  const [towns, setTowns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function finishCustomerSignup() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: updated } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id)
      .select()
      .single<Profile>();
    if (updated) setProfile(updated);
  }

  useEffect(() => {
    if (!isTradie) finishCustomerSignup();
  }, [isTradie]);

  async function handleSave() {
    if (towns.length === 0) {
      setError('Add at least one town you service');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: updatedProfile }, { data: updatedTP }] = await Promise.all([
      supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id).select().single<Profile>(),
      supabase.from('tradie_profiles').update({ service_towns: towns }).eq('id', user.id).select().single<TradieProfile>(),
    ]);

    if (updatedProfile) setProfile(updatedProfile);
    if (updatedTP) setTradieProfile(updatedTP);
    setLoading(false);
  }

  if (!isTradie) return <LoadingSpinner full />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={3} current={3} />

        <Text style={[styles.title, { color: colors.text }]}>Towns you service</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add every town you are willing to travel to for work. Customers posting jobs in these towns will be able to find you.
        </Text>

        <TownSelector towns={towns} onChange={(t) => { setTowns(t); setError(null); }} />

        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
            <Text style={{ color: '#991b1b' }}>{error}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button size="lg" loading={loading} onPress={handleSave}>
            Finish setup
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, gap: 16 },
  back: { marginBottom: 8 },
  backText: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  errorBox: { borderRadius: 8, padding: 12 },
  footer: { marginTop: 'auto', paddingTop: 16, gap: 12, alignItems: 'center' },
});
