import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { Avatar } from '@/components/ui/avatar';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocation } from '@/hooks/use-location';
import { useNearbyJobs } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';

export default function TradieHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, tradieProfile } = useAuthStore();
  const { coords } = useLocation();
  const radius = tradieProfile?.service_radius_km ?? 50;
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | null>(null);

  const { jobs } = useNearbyJobs(
    coords?.latitude ?? -26.2041,
    coords?.longitude ?? 28.0473,
    radius,
    selectedCategory ?? undefined
  );

  const region: Region = {
    latitude: coords?.latitude ?? -26.2041,
    longitude: coords?.longitude ?? 28.0473,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Nearby Jobs</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} within {radius} km
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tradie)/profile')}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} color="#38BDF8" />
        </Pressable>
      </View>

      {/* Category filter */}
      <View style={styles.filters}>
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.filterChip,
            { borderColor: !selectedCategory ? Brand.primary : colors.border, backgroundColor: !selectedCategory ? Brand.primaryLight : colors.surface },
          ]}
        >
          <Text style={[styles.filterText, { color: !selectedCategory ? Brand.primaryDark : colors.textSecondary }]}>
            All
          </Text>
        </Pressable>
        {TRADE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.value}
            onPress={() => setSelectedCategory(cat.value === selectedCategory ? null : cat.value)}
            style={[
              styles.filterChip,
              {
                borderColor: selectedCategory === cat.value ? Brand.primary : colors.border,
                backgroundColor: selectedCategory === cat.value ? Brand.primaryLight : colors.surface,
              },
            ]}
          >
            <Text style={styles.filterIcon}>{cat.icon}</Text>
            <Text style={[styles.filterText, { color: selectedCategory === cat.value ? Brand.primaryDark : colors.textSecondary }]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <MapView style={styles.map} region={region} showsUserLocation>
        {jobs.map((job) => (
          <Marker
            key={job.id}
            coordinate={{ latitude: job.latitude ?? region.latitude, longitude: job.longitude ?? region.longitude }}
            pinColor={Brand.primary}
            onCalloutPress={() => router.push(`/(tradie)/jobs/${job.id}`)}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{job.title}</Text>
                <Text style={styles.calloutSub}>{job.suburb ?? job.address_text}</Text>
                <Text style={styles.calloutTap}>Tap to view →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTextWrap: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'nowrap', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterIcon: { fontSize: 14 },
  filterText: { fontSize: 12, fontWeight: '500' },
  map: { flex: 1 },
  callout: { padding: 10, maxWidth: 200, gap: 2 },
  calloutTitle: { fontSize: 14, fontWeight: '700' },
  calloutSub: { fontSize: 12, color: '#64748b' },
  calloutTap: { fontSize: 11, color: '#F97316', marginTop: 4 },
});
