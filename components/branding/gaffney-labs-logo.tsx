import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GaffneyLabsLogoProps {
  size?: number;
  color?: string;
}

export function GaffneyLabsLogo({ size = 1, color = '#000000' }: GaffneyLabsLogoProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.toggle, { borderColor: color, width: 72 * size, height: 36 * size, borderRadius: 18 * size, borderWidth: 4.5 * size }]}>
        <View style={[styles.knob, { backgroundColor: color, width: 26 * size, height: 26 * size, borderRadius: 13 * size }]} />
      </View>
      <View style={styles.wordmarkBlock}>
        <Text style={[styles.wordmark, { fontSize: 18 * size, color }]}>Gaffney</Text>
        <Text style={[styles.labs, { fontSize: 11 * size, color }]}>LABS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    marginRight: 14,
  },
  knob: {},
  wordmarkBlock: {
    alignItems: 'flex-start',
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  labs: {
    letterSpacing: 5,
    marginTop: 4,
  },
});
