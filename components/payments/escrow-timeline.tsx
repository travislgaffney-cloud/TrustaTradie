import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { PaymentStatus } from '@/types/database';

interface Step {
  label: string;
  description: string;
  status: 'done' | 'active' | 'pending';
}

function getSteps(paymentStatus: PaymentStatus): Step[] {
  const steps: { label: string; description: string; paymentStatus: PaymentStatus }[] = [
    { label: 'Payment Made', description: 'Customer paid via PayFast', paymentStatus: 'held_in_escrow' },
    { label: 'Funds Held', description: 'Money secured in escrow', paymentStatus: 'held_in_escrow' },
    { label: 'Job In Progress', description: 'Tradie completing the work', paymentStatus: 'held_in_escrow' },
    { label: 'Payment Released', description: '95% paid to tradie', paymentStatus: 'released' },
  ];

  const ORDER: PaymentStatus[] = ['pending', 'held_in_escrow', 'released'];
  const currentIdx = ORDER.indexOf(paymentStatus);

  return steps.map((s, i) => ({
    label: s.label,
    description: s.description,
    status: i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending',
  }));
}

export function EscrowTimeline({ status }: { status: PaymentStatus }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const steps = getSteps(status);

  return (
    <View style={styles.container}>
      {steps.map((step, i) => (
        <View key={step.label} style={styles.step}>
          <View style={styles.iconCol}>
            <View style={[
              styles.dot,
              step.status === 'done' && { backgroundColor: Brand.primary },
              step.status === 'active' && { backgroundColor: Brand.primary, borderColor: Brand.primaryLight, borderWidth: 3 },
              step.status === 'pending' && { backgroundColor: colors.border },
            ]}>
              {step.status === 'done' && <Text style={styles.check}>✓</Text>}
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.line, { backgroundColor: step.status === 'done' ? Brand.primary : colors.border }]} />
            )}
          </View>
          <View style={styles.text}>
            <Text style={[styles.label, { color: colors.text }]}>{step.label}</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{step.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  step: { flexDirection: 'row', gap: 14, minHeight: 60 },
  iconCol: { alignItems: 'center', width: 28 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  check: { color: '#fff', fontSize: 14, fontWeight: '700' },
  line: { width: 2, flex: 1, marginVertical: 4 },
  text: { flex: 1, paddingBottom: 16 },
  label: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 13, lineHeight: 18 },
});
