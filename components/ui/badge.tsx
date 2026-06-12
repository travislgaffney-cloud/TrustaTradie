import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#f1f5f9', text: '#475569' },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  error: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  outline: { bg: 'transparent', text: '#64748b' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const vs = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: vs.bg },
        variant === 'outline' && styles.outlined,
      ]}
    >
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  outlined: { borderWidth: 1, borderColor: '#cbd5e1' },
  text: { fontSize: 12, fontWeight: '500' },
});
