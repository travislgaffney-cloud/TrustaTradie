import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSuppliers, linkSupplierAccount } from '@/hooks/use-rewards';
import { useAuthStore } from '@/store/auth-store';
import type { Supplier } from '@/types/database';

export default function LinkSupplierScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile } = useAuthStore();
  const { suppliers, loading } = useActiveSuppliers();

  const [selected, setSelected] = useState<Supplier | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLink() {
    if (!user || !selected) return;
    if (!accountNumber.trim()) {
      Alert.alert('Account number required', 'Enter your account number at this supplier.');
      return;
    }
    if (!consented) {
      Alert.alert('Consent required', 'You need to agree to share your details with this supplier to link your account.');
      return;
    }

    setSubmitting(true);
    try {
      await linkSupplierAccount({
        tradieId: user.id,
        supplierId: selected.id,
        accountNumber: accountNumber.trim(),
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not link this supplier. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => (selected ? setSelected(null) : router.back())}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Link a Supplier</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : !selected ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Choose a partner supplier to link your account with.</Text>
          {suppliers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No partner suppliers are available yet.</Text>
            </Card>
          ) : (
            suppliers.map((s) => (
              <Pressable key={s.id} onPress={() => setSelected(s)}>
                <Card style={styles.supplierCard}>
                  <Text style={[styles.supplierName, { color: colors.text }]}>{s.name}</Text>
                  <Text style={[styles.supplierReward, { color: Brand.primary }]}>
                    {(s.reward_pct * 100).toFixed(0)}% reward on verified spend
                  </Text>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{selected.name}</Text>

          <Input
            label="Your account number at this supplier"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="e.g. 123456"
            autoCapitalize="characters"
          />

          <Card style={[styles.consentCard, { borderColor: colors.border }]}>
            <View style={styles.consentRow}>
              <Switch value={consented} onValueChange={setConsented} trackColor={{ true: Brand.primary }} />
              <Text style={[styles.consentText, { color: colors.text }]}>
                I agree that Trust-a-Tradie may share my name, account number at {selected.name}, and my verified
                till-slip spend with {selected.name} so they can load reward credit onto my account there.
              </Text>
            </View>
            <Text style={[styles.consentHint, { color: colors.textSecondary }]}>
              {profile?.full_name ? `Linking as ${profile.full_name}. ` : ''}You can unlink or edit this account later from Supplier Rewards.
            </Text>
          </Card>

          <Button size="lg" loading={submitting} onPress={handleLink}>
            Link Account
          </Button>
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
  intro: { fontSize: 14 },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  supplierCard: { gap: 4 },
  supplierName: { fontSize: 16, fontWeight: '700' },
  supplierReward: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  consentCard: { borderWidth: 1, gap: 10 },
  consentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19 },
  consentHint: { fontSize: 12, lineHeight: 17 },
});
