import { router } from 'expo-router';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRewardSlips } from '@/hooks/use-rewards';
import type { RewardSlipStatus } from '@/types/database';

const STATUS_VARIANT: Record<RewardSlipStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const STATUS_LABEL: Record<RewardSlipStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function RewardSlipsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { slips, loading } = useRewardSlips();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>My Slips</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : slips.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No slips yet"
          description="Upload a till slip for one of your linked suppliers to start earning rewards."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {slips.map((slip) => (
            <Card key={slip.id} style={styles.slipCard}>
              <View style={styles.slipTop}>
                <Text style={[styles.supplierName, { color: colors.text }]}>{slip.supplier?.name ?? 'Supplier'}</Text>
                <Badge label={STATUS_LABEL[slip.status]} variant={STATUS_VARIANT[slip.status]} />
              </View>
              <Text style={[styles.slipMeta, { color: colors.textSecondary }]}>
                Slip #{slip.slip_number} · {format(new Date(slip.slip_date), 'd MMM yyyy')}
              </Text>
              <Text style={[styles.slipAmount, { color: colors.text }]}>R{Number(slip.total_amount).toLocaleString()}</Text>
              {slip.status === 'rejected' && slip.rejected_reason && (
                <Text style={[styles.rejectedReason, { color: '#991b1b' }]}>Reason: {slip.rejected_reason}</Text>
              )}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  slipCard: { gap: 6 },
  slipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierName: { fontSize: 15, fontWeight: '700' },
  slipMeta: { fontSize: 12 },
  slipAmount: { fontSize: 18, fontWeight: '800' },
  rejectedReason: { fontSize: 12, fontStyle: 'italic' },
});
