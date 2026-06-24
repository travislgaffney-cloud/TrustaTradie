import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  onDelete?: () => void;
  mode?: 'customer' | 'tradie';
  hasQuoted?: boolean;
}

export function JobCard({ job, showDistance, distanceKm, onPress, onDelete, mode = 'customer', hasQuoted }: JobCardProps) {
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

  function handleDelete() {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <Card elevated style={styles.card}>
        {firstImage && (
          <Image source={{ uri: firstImage }} style={styles.image} />
        )}
        {onDelete && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { backgroundColor: colors.surface }]}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        {hasQuoted && (
          <View style={styles.quotedBanner}>
            <Text style={styles.quotedBannerText}>✅ Quote submitted</Text>
          </View>
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
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  quotedBanner: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  quotedBannerText: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  content: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  location: { fontSize: 12 },
  time: { fontSize: 12 },
  budget: { fontSize: 12, fontWeight: '500' },
});
