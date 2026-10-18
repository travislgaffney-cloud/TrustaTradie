import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTradieSupplierAccounts, useRewardSlips } from '@/hooks/use-rewards';

export default function RewardsOverviewScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useTradieSupplierAccounts();
  const { slips, loading: slipsLoading, refresh: refreshSlips } = useRewardSlips();

  useRefreshOnFocus(() => { refreshAccounts(); refreshSlips(); });

  const loading = accountsLoading || slipsLoading;

  const now = new Date();
  const thisMonthSlips = slips.filter((s) => {
    const d = new Date(s.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const spendBySupplier = new Map<string, number>();
  for (const s of thisMonthSlips) {
    spendBySupplier.set(s.supplier_id, (spendBySupplier.get(s.supplier_id) ?? 0) + Number(s.total_amount));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Supplier Rewards</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Link your accounts with partner suppliers, submit till slips for verified spend, and they&apos;ll load
            store credit onto your account there — Trust-a-Tradie never holds or pays out the credit itself.
          </Text>

          <View style={styles.actionsRow}>
            <Button size="lg" onPress={() => router.push('/(tradie)/rewards/link-supplier')}>
              🔗 Link a Supplier
            </Button>
          </View>

          {accounts.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              onPress={() => router.push('/(tradie)/rewards/upload-slip')}
            >
              📸 Upload a Till Slip
            </Button>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Linked Suppliers</Text>
          {accounts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No suppliers linked yet. Link one to start submitting till slips.
              </Text>
            </Card>
          ) : (
            accounts.map((acc) => {
              const spend = spendBySupplier.get(acc.supplier_id) ?? 0;
              const rewardPct = acc.supplier?.reward_pct ?? 0;
              return (
                <Card key={acc.id} style={styles.supplierCard}>
                  <View style={styles.supplierRow}>
                    <View style={styles.supplierInfo}>
                      <Text style={[styles.supplierName, { color: colors.text }]}>{acc.supplier?.name ?? 'Supplier'}</Text>
                      <Text style={[styles.supplierAccount, { color: colors.textSecondary }]}>
                        Account: {acc.account_number}
                      </Text>
                    </View>
                    <Badge label="Linked" variant="success" />
                  </View>
                  <View style={styles.supplierStatsRow}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Spend this month: <Text style={{ color: colors.text, fontWeight: '700' }}>R{spend.toLocaleString()}</Text>
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Est. reward: <Text style={{ color: Brand.primary, fontWeight: '700' }}>R{(spend * rewardPct).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                    </Text>
                  </View>
                </Card>
              );
            })
          )}

          <Pressable
            style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tradie)/rewards/slips')}
          >
            <Text style={styles.linkIcon}>🧾</Text>
            <Text style={[styles.linkText, { color: colors.text }]}>View All Slips</Text>
            <Text style={[styles.linkArrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
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
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20 },
  actionsRow: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  supplierCard: { gap: 10 },
  supplierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  supplierInfo: { flex: 1, gap: 2 },
  supplierName: { fontSize: 15, fontWeight: '700' },
  supplierAccount: { fontSize: 13 },
  supplierStatsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  statLabel: { fontSize: 13 },
  linkCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: { fontSize: 22 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600' },
  linkArrow: { fontSize: 22, fontWeight: '300' },
});
