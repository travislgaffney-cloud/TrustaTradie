import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { jobDraft } from './details';

export default function PostJobLocationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: -26.2041,
    longitude: 28.0473,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoords, setMarkerCoords] = useState({ lat: -26.2041, lng: 28.0473 });
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [province, setProvince] = useState('');

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
        const r = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(r);
        setMarkerCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      });
    });
  }, []);

  async function reverseGeocode(lat: number, lng: number) {
    const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (geo) {
      setSuburb(geo.district ?? geo.subregion ?? '');
      setProvince(geo.region ?? '');
      setAddress([geo.streetNumber, geo.street, geo.district, geo.region].filter(Boolean).join(', '));
    }
  }

  function handleMapPress(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoords({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
  }

  function handleContinue() {
    jobDraft.locationLat = markerCoords.lat;
    jobDraft.locationLng = markerCoords.lng;
    jobDraft.addressText = address;
    jobDraft.suburb = suburb;
    jobDraft.province = province;
    router.push('/(customer)/post-job/review' as never);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <StepIndicator steps={4} current={3} />

        <Text style={[styles.title, { color: colors.text }]}>Job location</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tap the map to set the exact job site, or enter the address below.
        </Text>

        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation
        >
          <Marker
            coordinate={{ latitude: markerCoords.lat, longitude: markerCoords.lng }}
            pinColor="#F97316"
          />
        </MapView>

        <View style={styles.form}>
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="123 Main Rd, Sandton" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Suburb" value={suburb} onChangeText={setSuburb} placeholder="Sandton" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Province" value={province} onChangeText={setProvince} placeholder="Gauteng" />
            </View>
          </View>
        </View>

        <Button size="lg" onPress={handleContinue}>Continue →</Button>
      </ScrollView>
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
  map: { height: 220, borderRadius: 14, overflow: 'hidden' },
  form: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
