import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TransactionStatus } from '@/types/database';

interface Step {
  label: string;
  description: string;
  status: 'done' | 'active' | 'pending';
}

const ORDER: TransactionStatus[] = ['accepted', 'funds_held', 'completed_by_provider', 'confirmed_by_customer', 'released'];

const STEP_DEFS: { label: string; description: string; target: TransactionStatus }[] = [
  { label: 'Payment Held in Escrow', description: 'Funds secured via TradeSafe', target: 'funds_held' },
  { label: 'Job Completed', description: 'Tradie marked the job as done', target: 'completed_by_provider' },
  { label: 'Confirmed by You', description: 'You approved the completed work', target: 'confirmed_by_customer' },
  { label: 'Payment Released', description: 'Funds paid out, minus commission', target: 'released' },
];

function getSteps(status: TransactionStatus): Step[] {
  const currentIdx = ORDER.indexOf(status);
  return STEP_DEFS.map((d) => {
    const targetIdx = ORDER.indexOf(d.target);
    return {
      label: d.label,
      description: d.description,
      status: currentIdx > targetIdx ? 'done' : currentIdx === targetIdx ? 'active' : 'pending',
    };
  });
}

export function EscrowTimeline({ status }: { status: TransactionStatus }) {
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
