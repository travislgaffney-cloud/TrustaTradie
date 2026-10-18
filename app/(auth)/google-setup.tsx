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
import { UserTypeSelector } from '@/components/auth/user-type-selector';
import { Brand, Colors } from '@/constants/theme';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/trade-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function GoogleSetupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

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

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone || null, role })
      .eq('id', user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

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
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text style={[styles.catLabel, { color: isSelected ? Brand.primaryDark : colors.text }]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
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
  errorBox: { borderRadius: 8, padding: 12 },
  footer: { marginTop: 'auto', paddingTop: 16 },
});
