import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';

interface TrustATradieLogoProps {
  size?: number;
  textColor?: string;
}

export function TrustATradieLogo({ size = 1, textColor = '#1B2D4F' }: TrustATradieLogoProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.t, { fontSize: 96 * size, lineHeight: 96 * size }]}>T</Text>
      <View style={[styles.divider, { height: 84 * size }]} />
      <View style={styles.wordmarkBlock}>
        <Text style={[styles.wordmark, { fontSize: 26 * size, color: textColor }]}>TRUST-A-TRADIE</Text>
        <View style={[styles.rule, { width: 280 * size }]} />
        <Text style={[styles.slogan, { fontSize: 13 * size }]}>TRADIES YOU CAN TRUST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  t: {
    fontWeight: '800',
    color: Brand.primary,
    letterSpacing: -2,
  },
  divider: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  wordmarkBlock: {
    alignItems: 'flex-start',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rule: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Brand.primary,
    marginTop: 8,
  },
  slogan: {
    fontWeight: '600',
    color: Brand.primary,
    letterSpacing: 3,
    marginTop: 8,
  },
});
