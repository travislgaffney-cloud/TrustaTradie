import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/tradie/rating-stars';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Rating } from '@/types/database';

interface Props {
  rating: Rating;
}

export function ReviewCard({ rating }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const images = rating.images?.sort((a, b) => a.sort_order - b.sort_order) ?? [];

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Avatar uri={rating.customer?.avatar_url} name={rating.customer?.full_name} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {rating.customer?.full_name ?? 'Customer'}
            </Text>
            <RatingStars rating={rating.score} size={13} />
          </View>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(rating.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {rating.comment && (
          <Text style={[styles.comment, { color: colors.textSecondary }]}>{rating.comment}</Text>
        )}

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            <View style={styles.imageRow}>
              {images.map((img) => (
                <Pressable key={img.id} onPress={() => setPreviewUri(img.url)}>
                  <Image source={{ uri: img.url }} style={styles.thumbnail} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </Card>

      {previewUri && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
          <Pressable style={styles.previewOverlay} onPress={() => setPreviewUri(null)}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, fontWeight: '600' },
  date: { fontSize: 11 },
  comment: { fontSize: 13, lineHeight: 18 },
  imageScroll: { marginTop: 4 },
  imageRow: { flexDirection: 'row', gap: 6 },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
});
