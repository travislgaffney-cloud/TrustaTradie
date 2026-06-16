import { zodResolver } from '@hookform/resolvers/zod';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLATFORM_FEE } from '@/constants/config';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { submitQuote } from '@/hooks/use-quotes';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  amount: z.string().min(1).refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  message: z.string().min(20, 'Please provide more detail about your approach'),
  timelineDays: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter estimated days'),
});

type FormData = z.infer<typeof schema>;

type AttachedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export default function SubmitQuoteScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [includesVat, setIncludesVat] = useState(true);
  const [attachment, setAttachment] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = Number(watch('amount') ?? 0);
  const tradiePayout = amount * (1 - PLATFORM_FEE);

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `quote-${Date.now()}.jpg`;
      setAttachment({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
    }
  }

  async function uploadAttachment(): Promise<string | undefined> {
    if (!attachment || !user) return undefined;
    setUploading(true);
    try {
      const ext = attachment.name.split('.').pop() ?? 'bin';
      const path = `${user.id}/${jobId}/${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(attachment.uri, { encoding: 'base64' });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error } = await supabase.storage.from('quote-documents').upload(path, bytes, {
        contentType: attachment.mimeType,
        upsert: true,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('quote-documents').getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    setLoading(true);
    try {
      const quoteDocumentUrl = await uploadAttachment();
      await submitQuote({
        jobId,
        tradieId: user.id,
        amount: Number(data.amount),
        includesVat,
        message: data.message,
        timelineDays: Number(data.timelineDays),
        quoteDocumentUrl,
      });
      router.replace('/(tradie)/my-quotes');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Submit Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Controller control={control} name="amount" render={({ field }) => (
            <Input
              label="Quote amount (R) *"
              keyboardType="numeric"
              placeholder="5000"
              error={errors.amount?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          <Pressable onPress={() => setIncludesVat(!includesVat)} style={styles.vatToggle}>
            <View style={[styles.checkbox, includesVat && { backgroundColor: colors.tint, borderColor: colors.tint }]}>
              {includesVat && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.vatLabel, { color: colors.text }]}>Amount includes VAT (15%)</Text>
          </Pressable>

          {amount > 0 && (
            <View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.bLabel, { color: colors.textSecondary }]}>You quoted:</Text>
              <Text style={[styles.bValue, { color: colors.text }]}>R{amount.toLocaleString()}</Text>
              <Text style={[styles.bLabel, { color: colors.textSecondary }]}>Trust-a-Tradie fee (5%):</Text>
              <Text style={[styles.bValue, { color: colors.error }]}>− R{(amount * PLATFORM_FEE).toFixed(2)}</Text>
              <Text style={[styles.bLabel, { color: colors.text, fontWeight: '700' }]}>You receive:</Text>
              <Text style={[styles.bValue, { color: colors.text, fontWeight: '700', fontSize: 18 }]}>R{tradiePayout.toFixed(2)}</Text>
            </View>
          )}

          <Controller control={control} name="message" render={({ field }) => (
            <Input
              label="Message to customer *"
              placeholder="Describe your approach, materials you'll use, and why you're the right person for this job..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 110 }}
              error={errors.message?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          <Controller control={control} name="timelineDays" render={({ field }) => (
            <Input
              label="Estimated days to complete *"
              keyboardType="numeric"
              placeholder="3"
              error={errors.timelineDays?.message}
              onChangeText={field.onChange}
              value={field.value}
            />
          )} />

          {/* Quote document attachment */}
          <View style={styles.attachSection}>
            <Text style={[styles.attachLabel, { color: colors.text }]}>Attach quote document (optional)</Text>
            <Text style={[styles.attachHint, { color: colors.textSecondary }]}>
              Upload a PDF, Word doc, or photo of your formal quote
            </Text>

            {attachment ? (
              <View style={[styles.attachedFile, { backgroundColor: colors.surface, borderColor: Brand.secondary }]}>
                <Text style={styles.attachedIcon}>
                  {attachment.mimeType.startsWith('image') ? '🖼️' : '📄'}
                </Text>
                <Text style={[styles.attachedName, { color: colors.text }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Pressable onPress={() => setAttachment(null)}>
                  <Text style={[styles.removeBtn, { color: colors.error }]}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.attachButtons}>
                <Pressable
                  onPress={pickFromGallery}
                  style={[styles.attachBtn, { backgroundColor: Brand.secondary }]}
                >
                  <Text style={styles.attachBtnIcon}>🖼️</Text>
                  <Text style={styles.attachBtnLabel}>Camera Roll</Text>
                </Pressable>
                <Pressable
                  onPress={pickDocument}
                  style={[styles.attachBtn, { backgroundColor: Brand.secondary }]}
                >
                  <Text style={styles.attachBtnIcon}>📁</Text>
                  <Text style={styles.attachBtnLabel}>Browse Files</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Button size="lg" loading={loading || uploading} onPress={handleSubmit(onSubmit)}>
            {uploading ? 'Uploading...' : 'Submit Quote'}
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
  scroll: { padding: 16, flexGrow: 1 },
  form: { gap: 14 },
  vatToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  vatLabel: { fontSize: 14 },
  breakdown: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bLabel: { fontSize: 13, width: '60%' },
  bValue: { fontSize: 14, width: '38%', textAlign: 'right' },
  attachSection: { gap: 8 },
  attachLabel: { fontSize: 14, fontWeight: '600' },
  attachHint: { fontSize: 12 },
  attachButtons: { flexDirection: 'row', gap: 10 },
  attachBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  attachBtnIcon: { fontSize: 24 },
  attachBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  attachedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
  },
  attachedIcon: { fontSize: 22 },
  attachedName: { flex: 1, fontSize: 13 },
  removeBtn: { fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
});
