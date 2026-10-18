import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSuppliers, useTradieSupplierAccounts, uploadSlipImage, submitRewardSlip, type SlipOcrResult } from '@/hooks/use-rewards';
import { useAuthStore } from '@/store/auth-store';
import type { Supplier } from '@/types/database';

export default function UploadSlipScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { suppliers, loading: suppliersLoading } = useActiveSuppliers();
  const { accounts, loading: accountsLoading } = useTradieSupplierAccounts();

  const linkedSupplierIds = new Set(accounts.map((a) => a.supplier_id));
  const linkedSuppliers = suppliers.filter((s) => linkedSupplierIds.has(s.id));

  const [selected, setSelected] = useState<Supplier | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [ocr, setOcr] = useState<SlipOcrResult | null>(null);

  const [slipNumber, setSlipNumber] = useState('');
  const [slipDate, setSlipDate] = useState(new Date());
  const [totalAmount, setTotalAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loading = suppliersLoading || accountsLoading;

  async function handlePickPhoto() {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }).catch(() => null);
    const picked = result && !result.canceled ? result : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (picked.canceled || !user) return;

    const uri = picked.assets[0].uri;
    setLocalUri(uri);
    setUploading(true);
    try {
      const { path, ocr: extracted } = await uploadSlipImage(user.id, uri);
      setImagePath(path);
      setOcr(extracted);
      if (extracted.ocrAvailable) {
        if (extracted.total) setTotalAmount(String(extracted.total));
        if (extracted.date) {
          const parsed = new Date(extracted.date);
          if (!isNaN(parsed.getTime())) setSlipDate(parsed);
        }
      }
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload the photo. Please try again.');
      setLocalUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!user || !selected || !imagePath) return;
    if (!slipNumber.trim()) {
      Alert.alert('Slip number required', 'Enter the slip or invoice number from the till slip.');
      return;
    }
    const amount = Number(totalAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Total required', 'Enter the total amount on the till slip.');
      return;
    }

    setSubmitting(true);
    try {
      await submitRewardSlip({
        tradieId: user.id,
        supplierId: selected.id,
        imagePath,
        slipNumber: slipNumber.trim(),
        slipDate: format(slipDate, 'yyyy-MM-dd'),
        totalAmount: amount,
        ocr: ocr ?? { ocrAvailable: false },
      });
      Alert.alert('Slip submitted', 'Your till slip has been submitted and is pending review.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Could not submit', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner full />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => (selected ? setSelected(null) : router.back())}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Upload a Till Slip</Text>
        <View style={{ width: 60 }} />
      </View>

      {!selected ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Which supplier is this slip for?</Text>
          {linkedSuppliers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                You need to link a supplier account before submitting a slip.
              </Text>
              <Button onPress={() => router.replace('/(tradie)/rewards/link-supplier')}>Link a Supplier</Button>
            </Card>
          ) : (
            linkedSuppliers.map((s) => (
              <Pressable key={s.id} onPress={() => setSelected(s)}>
                <Card style={styles.supplierCard}>
                  <Text style={[styles.supplierName, { color: colors.text }]}>{s.name}</Text>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{selected.name}</Text>

          {!localUri ? (
            <Button size="lg" onPress={handlePickPhoto}>
              📸 Take or Choose a Photo
            </Button>
          ) : (
            <>
              <Image source={{ uri: localUri }} style={styles.preview} />
              {uploading ? (
                <View style={styles.ocrRow}>
                  <ActivityIndicator color={Brand.primary} />
                  <Text style={[styles.ocrText, { color: colors.textSecondary }]}>Reading the slip…</Text>
                </View>
              ) : ocr && !ocr.ocrAvailable ? (
                <Text style={[styles.ocrNote, { color: colors.textSecondary }]}>
                  Couldn&apos;t auto-read this slip — enter the details below manually.
                </Text>
              ) : ocr ? (
                <Text style={[styles.ocrNote, { color: colors.textSecondary }]}>
                  Pre-filled from the photo — check these match the slip before submitting.
                </Text>
              ) : null}

              <Input
                label="Slip / invoice number"
                value={slipNumber}
                onChangeText={setSlipNumber}
                placeholder="e.g. INV-00123"
                autoCapitalize="characters"
              />

              <View>
                <Text style={[styles.label, { color: colors.text }]}>Slip date</Text>
                <Pressable
                  style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: colors.text }}>{format(slipDate, 'EEEE, d MMMM yyyy')}</Text>
                </Pressable>
              </View>

              <Input
                label="Total amount (R)"
                value={totalAmount}
                onChangeText={setTotalAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Button size="lg" loading={submitting} disabled={uploading} onPress={handleSubmit}>
                Submit Slip
              </Button>
            </>
          )}

          <DatePickerModal
            visible={showDatePicker}
            title="Slip Date"
            initialDate={slipDate}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(d) => { setSlipDate(d); setShowDatePicker(false); }}
          />
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
  emptyCard: { padding: 20, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  supplierCard: { gap: 4 },
  supplierName: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  preview: { width: '100%', height: 220, borderRadius: 12, resizeMode: 'cover' },
  ocrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ocrText: { fontSize: 13 },
  ocrNote: { fontSize: 12, fontStyle: 'italic' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dateBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
});
