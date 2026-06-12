import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
}

export function RatingStars({ rating, size = 16, showNumber = false }: RatingStarsProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View style={styles.row}>
      {Array(full).fill('★').map((s, i) => (
        <Text key={`f${i}`} style={[styles.star, { fontSize: size, color: '#F97316' }]}>{s}</Text>
      ))}
      {half && <Text style={[styles.star, { fontSize: size, color: '#F97316' }]}>½</Text>}
      {Array(empty).fill('☆').map((s, i) => (
        <Text key={`e${i}`} style={[styles.star, { fontSize: size, color: '#cbd5e1' }]}>{s}</Text>
      ))}
      {showNumber && (
        <Text style={[styles.number, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  star: { lineHeight: undefined },
  number: { marginLeft: 4, fontWeight: '600', color: '#64748b' },
});
