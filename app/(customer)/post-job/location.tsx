import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeTown } from '@/lib/towns';
import { jobDraft } from './details';

// Map/GPS-based picking is parked for now (hooks/use-location.ts and the
// react-native-maps usage that used to live here are left intact elsewhere
// for a later re-enable) — this is pure manual entry. `town` is the field
// job-matching actually filters on, so it's required and kept distinct from
// the free-text `suburb` shown for display.
export default function PostJobLocationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [address, setAddress] = useState(jobDraft.addressText ?? '');
  const [town, setTown] = useState(jobDraft.town ?? '');
  const [suburb, setSuburb] = useState(jobDraft.suburb ?? '');
  const [province, setProvince] = useState(jobDraft.province ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (!address.trim() || !town.trim()) {
      setError('Address and town are required so tradies in your area can find this job.');
      return;
    }
    jobDraft.addressText = address.trim();
    jobDraft.town = normalizeTown(town);
    jobDraft.suburb = suburb.trim();
    jobDraft.province = province.trim();
    router.push('/(customer)/post-job/review' as never);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={4} current={3} />

        <Text style={[styles.title, { color: colors.text }]}>Job location</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter the job site address. The town is what we use to find tradies who service your area.
        </Text>

        <View style={styles.form}>
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="123 Main Rd" />
          <Input label="Town" value={town} onChangeText={setTown} placeholder="e.g. Sandton" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Suburb (optional)" value={suburb} onChangeText={setSuburb} placeholder="Sandton" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Province (optional)" value={province} onChangeText={setProvince} placeholder="Gauteng" />
            </View>
          </View>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
            <Text style={{ color: '#991b1b' }}>{error}</Text>
          </View>
        )}

        <Button size="lg" onPress={handleContinue}>Continue →</Button>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 14, flexGrow: 1 },
  back: { marginBottom: 4 },
  backText: { fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  errorBox: { borderRadius: 8, padding: 12 },
});
