import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { TRADE_ICON_SOURCES } from '@/constants/trade-icons';
import type { TradeCategory } from '@/constants/trade-categories';

interface TradeIconProps {
  category: TradeCategory;
  size?: number;
}

export function TradeIcon({ category, size = 20 }: TradeIconProps) {
  return (
    <Image
      source={TRADE_ICON_SOURCES[category]}
      style={[styles.icon, { width: size, height: size, borderRadius: size * 0.22 }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  icon: {},
});
