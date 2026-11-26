import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { TradeIcon } from '@/components/ui/trade-icon';
import { UserTypeSelector } from '@/components/auth/user-type-selector';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { Profile } from '@/types/database';

export default function GoogleSetupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { setProfile } = useAuthStore();

  const [role, setRole] = useState<'customer' | 'tradie' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TradeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) setName(user.user_metadata.full_name);
      else if (user?.user_metadata?.name) setName(user.user_metadata.name);
    });
  }, []);

  function toggleCategory(cat: TradeCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleComplete() {
    if (!role) return;
    if (role === 'tradie' && selectedCategories.length === 0) {
      setError('Select at least one trade category');
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone || null, role })
      .eq('id', user.id)
      .select()
      .single<Profile>();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Sync the global store immediately — sign-up-location.tsx (navigated to
    // below) decides tradie-vs-customer from this, not from a fresh fetch, so
    // without this it would still see the stale pre-role-selection profile.
    if (updatedProfile) setProfile(updatedProfile);

    if (role === 'tradie') {
      const { error: tradieError } = await supabase
        .from('tradie_profiles')
        .upsert({ id: user.id, categories: selectedCategories });

      if (tradieError) {
        setError(tradieError.message);
        setLoading(false);
        return;
      }
    }

    router.replace('/(auth)/sign-up-location');
  }

  const canContinue =
    role !== null &&
    name.trim().length >= 2 &&
    (role === 'customer' || selectedCategories.length > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>Almost there</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tell us a bit more to finish setting up your account.
          </Text>

          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+27 82 000 0000"
          />

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            How will you use Trust-a-Tradie?
          </Text>
          <UserTypeSelector value={role} onChange={setRole} />

          {role === 'tradie' && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Your trade(s) — select all that apply
              </Text>
              <View style={styles.categories}>
                {TRADE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.value);
                  return (
                    <Pressable
                      key={cat.value}
                      onPress={() => toggleCategory(cat.value)}
                      style={[
                        styles.categoryChip,
                        {
                          borderColor: isSelected ? Brand.primary : colors.border,
                          backgroundColor: isSelected ? Brand.primaryLight : colors.surface,
                        },
                      ]}
                    >
                      <TradeIcon category={cat.value} size={32} />
                      <Text style={[styles.catLabel, { color: isSelected ? Brand.primaryDark : colors.text }]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.payoutNotice}>
                <Text style={styles.payoutNoticeTitle}>💰 How you get paid</Text>
                <Text style={styles.payoutNoticeBody}>
                  There&apos;s no deposit — the full quoted amount is held securely in escrow.
                  Once a job is marked complete, you&apos;re paid out your portion (the quoted
                  amount minus TrustaTradie&apos;s commission) in one payment.
                </Text>
              </View>

              <View style={styles.verifyNotice}>
                <Text style={styles.verifyNoticeTitle}>✓ Want the Verified badge?</Text>
                <Text style={styles.verifyNoticeBody}>
                  After signing up, you can apply to get verified for a once-off R99 fee —
                  we automatically check your ID number, CIPC registration, and bank account.
                  Verified tradies get a trust badge on their profile and appear first in
                  search results — ahead of unverified tradies.
                </Text>
              </View>
            </>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={{ color: '#991b1b' }}>{error}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Button size="lg" loading={loading} disabled={!canContinue} onPress={handleComplete}>
              Continue
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, flexGrow: 1, gap: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catIcon: { fontSize: 18 },
  catLabel: { fontSize: 14, fontWeight: '500' },
  payoutNotice: { backgroundColor: '#dbeafe', borderRadius: 10, padding: 14, gap: 4, marginTop: 12 },
  payoutNoticeTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  payoutNoticeBody: { fontSize: 13, lineHeight: 19, color: '#1e40af' },
  verifyNotice: { backgroundColor: '#dcfce7', borderRadius: 10, padding: 14, gap: 4, marginTop: 12 },
  verifyNoticeTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  verifyNoticeBody: { fontSize: 13, lineHeight: 19, color: '#166534' },
  errorBox: { borderRadius: 8, padding: 12 },
  footer: { marginTop: 'auto', paddingTop: 16 },
});
