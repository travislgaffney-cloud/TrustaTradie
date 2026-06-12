import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Brand } from '@/constants/theme';

interface LoadingSpinnerProps {
  full?: boolean;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ full = false, size = 'large' }: LoadingSpinnerProps) {
  if (full) {
    return (
      <View style={styles.full}>
        <ActivityIndicator size={size} color={Brand.primary} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={Brand.primary} />;
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
