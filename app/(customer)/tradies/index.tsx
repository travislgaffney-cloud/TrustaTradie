import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocation } from '@/hooks/use-location';
import { startDirectConversation } from '@/hooks/use-messages';
import { useNearbyTradies } from '@/hooks/use-nearby-tradies';
import { useAuthStore } from '@/store/auth-store';
import { RatingStars } from '@/components/tradie/rating-stars';

export default function TradiesNearMeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, user } = useAuthStore();
  const { coords, loading: locationLoading } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | null>(null);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  async function handleMessage(tradieId: string) {
    if (!user) return;
    setStartingChat(tradieId);
    try {
      const conversationId = await startDirectConversation(user.id, tradieId);
      router.push(`/(customer)/messages/${conversationId}`);
    } finally {
      setStartingChat(null);
    }
  }

  const lat = coords?.latitude ?? -26.2041;
  const lng = coords?.longitude ?? 28.0473;

  const { tradies, loading } = useNearbyTradies(lat, lng, 50, selectedCategory ?? undefined);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Tradies Near Me</Text>
            <Text style={styles.headerSubtitle}>
              {locationLoading ? 'Detecting your location…' : `Within 50 km of you`}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(customer)/profile')}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} color="#38BDF8" />
          </Pressable>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.filterChip,
            { borderColor: !selectedCategory ? Brand.primary : colors.border, backgroundColor: !selectedCategory ? Brand.primaryLight : colors.surface },
          ]}
        >
          <Text style={[styles.filterText, { color: !selectedCategory ? Brand.primaryDark : colors.textSecondary }]}>All</Text>
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
            <Text style={[styles.filterText, { color: selectedCategory === cat.value ? Brand.primaryDark : colors.textSecondary }]}>
              {cat.icon} {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tradie list */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} />}
      >
        {loading ? (
          <LoadingSpinner full />
        ) : tradies.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No tradies found"
            description="No tradies found in your area yet. Try expanding your search or check back later."
          />
        ) : (
          tradies.map((tradie) => (
            <Pressable
              key={tradie.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/tradie/${tradie.id}`)}
            >
              <View style={styles.cardHeader}>
                <Avatar uri={tradie.avatar_url} name={tradie.full_name} size={52} verified={tradie.is_verified} />
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>{tradie.full_name}</Text>
                    {tradie.is_verified && <Badge label="✓" variant="success" />}
                  </View>
                  <RatingStars rating={tradie.average_rating} showNumber size={13} />
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {tradie.distance_km.toFixed(1)} km away
                    {tradie.suburb ? ` · ${tradie.suburb}` : ''}
                  </Text>
                </View>
              </View>

              {tradie.bio ? (
                <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
                  {tradie.bio}
                </Text>
              ) : null}

              <View style={styles.categories}>
                {tradie.categories.slice(0, 3).map((c) => {
                  const cat = TRADE_CATEGORIES.find((t) => t.value === c);
                  return cat ? <Badge key={c} label={`${cat.icon} ${cat.label}`} /> : null;
                })}
                {tradie.categories.length > 3 && (
                  <Badge label={`+${tradie.categories.length - 3}`} />
                )}
              </View>

              <Pressable
                style={[styles.messageBtn, { backgroundColor: Brand.primary }]}
                onPress={() => handleMessage(tradie.id)}
                disabled={startingChat === tradie.id}
              >
                <Text style={styles.messageBtnText}>
                  {startingChat === tradie.id ? 'Opening…' : 'Message'}
                </Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: { flex: 1, gap: 4 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  filters: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  scroll: { padding: 16, gap: 12, flexGrow: 1 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12 },
  bio: { fontSize: 13, lineHeight: 18 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  messageBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  messageBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
