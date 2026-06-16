import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { SA_BANKS, ACCOUNT_TYPES } from '@/constants/trade-categories';

const schema = z.object({
  bankName: z.string().min(1, 'Select a bank'),
  accountNumber: z.string().min(6, 'Enter a valid account number'),
  branchCode: z.string().min(4, 'Enter branch code'),
  accountType: z.string().min(1, 'Select account type'),
  accountHolder: z.string().min(2, 'Enter account holder name'),
});

type FormData = z.infer<typeof schema>;

export default function BankDetailsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankName: profile?.bank_name ?? '',
      accountNumber: profile?.bank_account_number ?? '',
      branchCode: profile?.bank_branch_code ?? '',
      accountType: profile?.bank_account_type ?? '',
    },
  });

  async function onSubmit(data: FormData) {
    if (!user) return;
    setLoading(true);
    const { data: updated } = await supabase
      .from('profiles')
      .update({
        bank_name: data.bankName,
        bank_account_number: data.accountNumber,
        bank_branch_code: data.branchCode,
        bank_account_type: data.accountType,
      })
      .eq('id', user.id)
      .select()
      .single();
    if (updated && profile) setProfile({ ...profile, ...updated });
    setLoading(false);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Bank Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.note, { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }]}>
          <Text style={styles.noteText}>
            🏦 These details are used for manual EFT payouts when you complete a job. Your information is kept secure and never shared with customers.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Select your bank</Text>
        <View style={styles.banks}>
          {SA_BANKS.map((bank) => (
            <Pressable
              key={bank.value}
              onPress={() => {
                setSelectedBank(bank.value);
                setValue('bankName', bank.label);
                setValue('branchCode', bank.branchCode);
              }}
              style={[
                styles.bankChip,
                { borderColor: selectedBank === bank.value ? colors.tint : colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.bankLabel, { color: colors.text }]}>{bank.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <Controller control={control} name="bankName" render={({ field }) => (
            <Input label="Bank name *" error={errors.bankName?.message} onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="accountNumber" render={({ field }) => (
            <Input label="Account number *" keyboardType="numeric" error={errors.accountNumber?.message} onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="branchCode" render={({ field }) => (
            <Input label="Branch code *" keyboardType="numeric" error={errors.branchCode?.message} onChangeText={field.onChange} value={field.value} />
          )} />
          <Controller control={control} name="accountType" render={({ field }) => (
            <Input label="Account type *" error={errors.accountType?.message} onChangeText={field.onChange} value={field.value} placeholder="Cheque, Savings, etc." />
          )} />
          <Button size="lg" loading={loading} onPress={handleSubmit(onSubmit)}>
            Save Bank Details
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14 },
  note: { borderRadius: 10, borderWidth: 1, padding: 14 },
  noteText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  banks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankChip: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  bankLabel: { fontSize: 13, fontWeight: '500' },
  form: { gap: 14 },
});
