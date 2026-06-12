import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Job } from '@/types/database';
import { JobCategoryBadge } from './job-category-badge';
import { JobStatusBadge } from './job-status-badge';

interface JobCardProps {
  job: Job;
  showDistance?: boolean;
  distanceKm?: number;
  onPress?: () => void;
  mode?: 'customer' | 'tradie';
}

export function JobCard({ job, showDistance, distanceKm, onPress, mode = 'customer' }: JobCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const firstImage = job.images?.[0]?.url;

  function handlePress() {
    if (onPress) { onPress(); return; }
    if (mode === 'customer') {
      router.push(`/(customer)/jobs/${job.id}`);
    } else {
      router.push(`/(tradie)/jobs/${job.id}`);
    }
  }

  return (
    <Pressable onPress={handlePress}>
      <Card elevated style={styles.card}>
        {firstImage && (
          <Image source={{ uri: firstImage }} style={styles.image} />
        )}
        <View style={styles.content}>
          <View style={styles.row}>
            <JobCategoryBadge category={job.category} />
            <JobStatusBadge status={job.status} />
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {job.description}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              📍 {job.suburb ?? job.address_text}
              {showDistance && distanceKm != null && ` · ${distanceKm.toFixed(1)} km away`}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </Text>
          </View>
          {job.budget_min != null && (
            <Text style={[styles.budget, { color: colors.textSecondary }]}>
              Budget: R{job.budget_min.toLocaleString()}
              {job.budget_max ? ` – R${job.budget_max.toLocaleString()}` : '+'}
            </Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  image: { width: '100%', height: 140, resizeMode: 'cover' },
  content: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  location: { fontSize: 12 },
  time: { fontSize: 12 },
  budget: { fontSize: 12, fontWeight: '500' },
});
