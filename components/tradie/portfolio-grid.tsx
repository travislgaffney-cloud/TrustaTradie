import React from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PortfolioImage } from '@/types/database';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');
const COLS = 3;
const IMG_SIZE = (width - 48 - (COLS - 1) * 4) / COLS;

interface PortfolioGridProps {
  images: PortfolioImage[];
  onImagePress?: (image: PortfolioImage) => void;
}

export function PortfolioGrid({ images, onImagePress }: PortfolioGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  if (images.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No portfolio images yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      numColumns={COLS}
      scrollEnabled={false}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={{ gap: 4 }}
      ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => onImagePress?.(item)}>
          <Image
            source={{ uri: item.url }}
            style={[styles.image, { width: IMG_SIZE, height: IMG_SIZE }]}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  image: { borderRadius: 4, backgroundColor: '#e2e8f0' },
});
