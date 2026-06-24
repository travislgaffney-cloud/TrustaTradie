import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  color?: string;
  verified?: boolean;
}

export function Avatar({ uri, name, size = 44, color = Brand.primary, verified }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const fontSize = size * 0.38;
  const badgeSize = Math.max(size * 0.32, 14);

  const avatar = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );

  if (!verified) return avatar;

  return (
    <View style={{ width: size, height: size }}>
      {avatar}
      <View style={[styles.verifiedBadge, {
        width: badgeSize,
        height: badgeSize,
        borderRadius: badgeSize / 2,
        right: -1,
        bottom: -1,
      }]}>
        <Text style={[styles.verifiedCheck, { fontSize: badgeSize * 0.6 }]}>✓</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#e2e8f0' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedCheck: {
    color: '#fff',
    fontWeight: '800',
    lineHeight: 14,
  },
});
