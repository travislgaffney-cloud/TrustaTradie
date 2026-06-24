import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { TRADE_CATEGORIES } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Profile, TradieProfile } from '@/types/database';
import { RatingStars } from './rating-stars';

interface TradieCardProps {
  profile: Profile;
  tradieProfile: TradieProfile;
}

export function TradieCard({ profile, tradieProfile }: TradieCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Pressable onPress={() => router.push(`/tradie/${profile.id}`)}>
      <Card elevated style={styles.card}>
        <View style={styles.header}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={52} verified={tradieProfile.is_verified} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
              {tradieProfile.is_verified && <Badge label="✓ Verified" variant="success" />}
            </View>
            <RatingStars rating={tradieProfile.average_rating} showNumber />
            <Text style={[styles.stats, { color: colors.textSecondary }]}>
              {tradieProfile.completed_jobs} jobs · {tradieProfile.total_reviews} reviews
            </Text>
          </View>
        </View>

        <View style={styles.categories}>
          {tradieProfile.categories.slice(0, 3).map((c) => {
            const cat = TRADE_CATEGORIES.find((t) => t.value === c);
            return cat ? (
              <Badge key={c} label={`${cat.icon} ${cat.label}`} variant="default" />
            ) : null;
          })}
        </View>

        {profile.bio && (
          <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700' },
  stats: { fontSize: 12 },
  categories: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  bio: { fontSize: 13, lineHeight: 18 },
});
