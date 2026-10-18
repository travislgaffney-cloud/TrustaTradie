import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';

const PRIVACY_POLICY_URL = 'https://admin-five-chi-53.vercel.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://admin-five-chi-53.vercel.app/terms';

interface TermsConsentProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  textColor: string;
  error?: string;
}

export function TermsConsent({ checked, onToggle, textColor, error }: TermsConsentProps) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => onToggle(!checked)} hitSlop={8}>
        <View style={[styles.box, { borderColor: checked ? Brand.primary : '#94a3b8', backgroundColor: checked ? Brand.primary : 'transparent' }]}>
          {checked && <Text style={styles.check}>✓</Text>}
        </View>
        <Text style={[styles.label, { color: textColor }]}>
          I agree to the{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            Privacy Policy
          </Text>
        </Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  check: { color: '#fff', fontSize: 12, fontWeight: '800' },
  label: { flex: 1, fontSize: 13, lineHeight: 19 },
  link: { fontWeight: '700', textDecorationLine: 'underline', color: Brand.primary },
  error: { fontSize: 12, color: '#991b1b', marginLeft: 30 },
});
