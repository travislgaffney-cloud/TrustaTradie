import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateInvoice, uploadInvoice, useInvoice } from '@/hooks/use-invoices';
import { uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  tradieId: string;
  customerId: string;
  jobTitle: string;
}

export function InvoicePrompt({
  visible,
  onClose,
  jobId,
  tradieId,
  customerId,
  jobTitle,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string; amount: number; includesVat: boolean } | null>(null);
  const [fetchingPayment, setFetchingPayment] = useState(true);
  const [alreadySent, setAlreadySent] = useState(false);

  useEffect(() => {
    if (!visible || !jobId) return;
    setFetchingPayment(true);

    Promise.all([
      supabase
        .from('payments')
        .select('id, amount_total')
        .eq('job_id', jobId)
        .eq('tradie_id', tradieId)
        .maybeSingle(),
      supabase
        .from('quotes')
        .select('includes_vat')
        .eq('job_id', jobId)
        .eq('tradie_id', tradieId)
        .maybeSingle(),
      supabase
        .from('invoices')
        .select('id')
        .eq('job_id', jobId)
        .eq('tradie_id', tradieId)
        .maybeSingle(),
    ]).then(([{ data: payment }, { data: quote }, { data: existing }]) => {
      if (payment) {
        setPaymentData({
          id: payment.id,
          amount: payment.amount_total,
          includesVat: quote?.includes_vat ?? false,
        });
      }
      setAlreadySent(!!existing);
      setFetchingPayment(false);
    });
  }, [visible, jobId, tradieId]);

  async function handleGenerate() {
    if (!paymentData) return;
    setLoading(true);
    try {
      await generateInvoice({
        paymentId: paymentData.id,
        jobId,
        tradieId,
        customerId,
        amount: paymentData.amount,
        includesVat: paymentData.includesVat,
        jobTitle,
      });
      Alert.alert('Invoice Sent', 'An invoice has been generated and sent to the customer.');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate invoice.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!paymentData) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    setLoading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.name.split('.').pop() ?? 'pdf';
      const path = `${tradieId}/${paymentData.id}/${Date.now()}.${ext}`;
      const url = await uploadFile('invoices', path, asset.uri, asset.mimeType ?? 'application/pdf');

      await uploadInvoice({
        paymentId: paymentData.id,
        jobId,
        tradieId,
        customerId,
        amount: paymentData.amount,
        uploadedUrl: url,
        jobTitle,
      });
      Alert.alert('Invoice Sent', 'Your invoice has been uploaded and sent to the customer.');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not upload invoice.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Later</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Send Invoice</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {fetchingPayment ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Brand.primary} />
            </View>
          ) : alreadySent ? (
            <View style={styles.sentBox}>
              <Text style={styles.icon}>✅</Text>
              <Text style={[styles.title, { color: colors.text }]}>Invoice Already Sent</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                You have already sent an invoice for this job.
              </Text>
            </View>
          ) : !paymentData ? (
            <View style={styles.sentBox}>
              <Text style={styles.icon}>⏳</Text>
              <Text style={[styles.title, { color: colors.text }]}>Payment Not Found</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                No payment record found for this job yet. The customer may not have paid.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.icon}>🧾</Text>
              <Text style={[styles.title, { color: colors.text }]}>Invoice for {jobTitle}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Send the customer an invoice for this completed job. You can auto-generate one or upload your own.
              </Text>

              <View style={[styles.amountBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Invoice amount</Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>R{paymentData.amount.toLocaleString()}</Text>
                {paymentData.includesVat && (
                  <Text style={[styles.vatNote, { color: colors.textSecondary }]}>
                    Includes VAT: R{(paymentData.amount * 0.15 / 1.15).toFixed(2)}
                  </Text>
                )}
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={Brand.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.options}>
                  <Pressable
                    style={[styles.optionCard, { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }]}
                    onPress={handleGenerate}
                  >
                    <Text style={styles.optionIcon}>⚡</Text>
                    <Text style={[styles.optionTitle, { color: '#1e40af' }]}>Auto-Generate Invoice</Text>
                    <Text style={[styles.optionDesc, { color: '#3b82f6' }]}>
                      We'll create an invoice with the job details, amount, and your business info
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.optionCard, { backgroundColor: '#f3e8ff', borderColor: '#c4b5fd' }]}
                    onPress={handleUpload}
                  >
                    <Text style={styles.optionIcon}>📎</Text>
                    <Text style={[styles.optionTitle, { color: '#6b21a8' }]}>Upload Your Own</Text>
                    <Text style={[styles.optionDesc, { color: '#7c3aed' }]}>
                      Upload a PDF or image of your own invoice document
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancelText: { fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: 24, gap: 16, alignItems: 'center' },
  icon: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  amountBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: { fontSize: 13 },
  amountValue: { fontSize: 28, fontWeight: '900' },
  vatNote: { fontSize: 12 },
  loadingBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  loadingText: { fontSize: 14 },
  sentBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  options: { width: '100%', gap: 12 },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  optionIcon: { fontSize: 28 },
  optionTitle: { fontSize: 16, fontWeight: '800' },
  optionDesc: { fontSize: 13, lineHeight: 18 },
});
