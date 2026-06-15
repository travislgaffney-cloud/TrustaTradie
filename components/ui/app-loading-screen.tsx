import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GaffneyLabsLogo } from '@/components/branding/gaffney-labs-logo';
import { TrustATradieLogo } from '@/components/branding/trust-a-tradie-logo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AppLoadingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const wordmarkColor = scheme === 'dark' ? '#f1f5f9' : '#1B2D4F';
  const devLogoColor = scheme === 'dark' ? '#f1f5f9' : '#000000';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <TrustATradieLogo textColor={wordmarkColor} />
      </View>
      <View style={styles.footer}>
        <GaffneyLabsLogo size={0.7} color={devLogoColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 48,
  },
});
