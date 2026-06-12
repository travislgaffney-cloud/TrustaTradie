import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function SignUpLocationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [province, setProvince] = useState('');

  async function detectLocation() {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDetecting(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geo) {
        setSuburb(geo.district ?? geo.subregion ?? '');
        setProvince(geo.region ?? '');
        setAddress(
          [geo.street, geo.streetNumber, geo.district, geo.region, 'South Africa']
            .filter(Boolean)
            .join(', ')
        );
      }
    } catch (_) {
      // user denied or error — let them type manually
    }
    setDetecting(false);
  }

  async function handleSave() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const updateData: Record<string, unknown> = {
      address_text: address,
      onboarding_complete: true,
    };

    if (coords) {
      // Store as WKT point for PostGIS
      updateData.location = `POINT(${coords.lng} ${coords.lat})`;
    }

    await supabase.from('profiles').update(updateData).eq('id', user.id);

    setLoading(false);
    // Auth state change will handle redirect
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={3} current={3} />

        <Text style={[styles.title, { color: colors.text }]}>Your location</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We use your location to match you with nearby jobs and tradies.
        </Text>

        <View style={[styles.detectBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.detectIcon}>📍</Text>
          <Text style={[styles.detectTitle, { color: colors.text }]}>
            {coords ? 'Location detected' : 'Auto-detect your location'}
          </Text>
          {coords && (
            <Text style={[styles.detectAddress, { color: colors.textSecondary }]}>
              {address}
            </Text>
          )}
          <Button
            variant={coords ? 'secondary' : 'primary'}
            size="sm"
            loading={detecting}
            onPress={detectLocation}
          >
            {coords ? '🔄 Re-detect' : '📡 Use my location'}
          </Button>
        </View>

        <View style={styles.form}>
          <Input
            label="Full address"
            value={address}
            onChangeText={setAddress}
            placeholder="123 Main Road, Sandton"
            multiline
          />
          <Input
            label="Suburb"
            value={suburb}
            onChangeText={setSuburb}
            placeholder="e.g. Sandton"
          />
          <Input
            label="Province"
            value={province}
            onChangeText={setProvince}
            placeholder="e.g. Gauteng"
          />
        </View>

        <View style={styles.footer}>
          <Button size="lg" loading={loading} onPress={handleSave} disabled={!address}>
            Finish setup
          </Button>

          <Pressable onPress={handleSave}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip for now
            </Text>
          </Pressable>
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
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  detectBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  detectIcon: { fontSize: 36 },
  detectTitle: { fontSize: 16, fontWeight: '600' },
  detectAddress: { fontSize: 13, textAlign: 'center' },
  form: { gap: 14 },
  footer: { marginTop: 'auto', paddingTop: 16, gap: 12, alignItems: 'center' },
  skipText: { fontSize: 14 },
});
