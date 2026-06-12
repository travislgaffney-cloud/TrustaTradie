import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';

interface JobCategoryBadgeProps {
  category: TradeCategory;
}

export function JobCategoryBadge({ category }: JobCategoryBadgeProps) {
  const cat = TRADE_CATEGORIES.find((c) => c.value === category);
  if (!cat) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>{cat.icon}</Text>
      <Text style={styles.label}>{cat.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  icon: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', color: Brand.primaryDark },
});
