import React from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'gold';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: ImageSourcePropType;
  iconSize?: number;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#f1f5f9', text: '#475569' },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  error: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  outline: { bg: 'transparent', text: '#64748b' },
  gold: { bg: '#fef3c7', text: '#92400e' },
};

export function Badge({ label, variant = 'default', icon, iconSize = 26 }: BadgeProps) {
  const vs = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: vs.bg },
        variant === 'outline' && styles.outlined,
      ]}
    >
      {icon && (
        <Image
          source={icon}
          style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }]}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  outlined: { borderWidth: 1, borderColor: '#cbd5e1' },
  icon: {},
  text: { fontSize: 12, fontWeight: '500' },
});
