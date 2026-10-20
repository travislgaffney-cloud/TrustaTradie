import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieDocuments } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import { getSignedUrl, uploadPrivateFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';
import type { DocumentType } from '@/types/database';

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string; goldRequired?: boolean }[] = [
  { value: 'id_document', label: 'ID Document', goldRequired: true },
  { value: 'certificate', label: 'Qualification Certificate', goldRequired: true },
  { value: 'association', label: 'Association Membership', goldRequired: true },
  { value: 'licence', label: 'Licence' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const DOC_LABELS: Record<string, string> = Object.fromEntries(DOC_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export default function DocumentsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { documents, loading, refresh } = useTradieDocuments();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<DocumentType>('id_document');
  const [uploading, setUploading] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function handleUpload() {
    if (!user || !label.trim()) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled) return;
    setUploading(true);
    const asset = result.assets[0];
    const path = `${user.id}/${Date.now()}_${asset.name}`;
    const storedPath = await uploadPrivateFile('documents', path, asset.uri, asset.mimeType ?? 'application/pdf');
    await supabase.from('tradie_documents').insert({
      tradie_id: user.id,
      type,
      label: label.trim(),
      url: storedPath,
    });
    setLabel('');
    await refresh();
    setUploading(false);
  }

  async function handleView(docId: string, path: string) {
    setViewingId(docId);
    const signedUrl = await getSignedUrl('documents', path);
    setViewingId(null);
    if (!signedUrl) {
      Alert.alert('Could not open document', 'Please try again.');
      return;
    }
    Linking.openURL(signedUrl);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>My Documents</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.goldBanner, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
          <Text style={styles.goldBannerText}>
            ★ Upload a verified ID document, qualification certificate, and association membership to earn the Gold TT Badge — the highest level of verified on Trust-a-Tradie.
          </Text>
        </View>

        <View style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload a new document</Text>

          <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>Document type</Text>
          <View style={styles.typeRow}>
            {DOC_TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={[
                  styles.typeChip,
                  { borderColor: colors.border },
                  type === opt.value && styles.typeChipActive,
                ]}
              >
                <Text style={[styles.typeChipText, type === opt.value && styles.typeChipTextActive]}>
                  {opt.goldRequired ? '★ ' : ''}{opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input label="Document label" placeholder="e.g. SA ID Book, Electrical Trade Certificate" value={label} onChangeText={setLabel} />
          <Button variant="secondary" loading={uploading} onPress={handleUpload} disabled={!label.trim()}>
            📎 Choose File & Upload
          </Button>
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : documents.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No documents uploaded yet. Add your qualifications to build trust with customers.
          </Text>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} style={styles.docCard}>
              <View style={styles.docRow}>
                <Text style={styles.docIcon}>📄</Text>
                <View style={styles.docInfo}>
                  <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                  <Text style={[styles.docDate, { color: colors.textSecondary }]}>
                    {DOC_LABELS[doc.type] ?? 'Document'} · {new Date(doc.created_at).toLocaleDateString('en-ZA')}
                  </Text>
                </View>
                {doc.is_verified ? (
                  <Badge label="✓ Verified" variant="success" />
                ) : (
                  <Badge label="Pending" variant="warning" />
                )}
              </View>
              <Pressable onPress={() => handleView(doc.id, doc.url)} disabled={viewingId === doc.id} style={styles.viewLink}>
                <Text style={[styles.viewLinkText, { color: colors.tint }]}>
                  {viewingId === doc.id ? 'Opening…' : '👁️ View'}
                </Text>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14 },
  uploadBox: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  uploadTitle: { fontSize: 15, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  docCard: { gap: 0 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIcon: { fontSize: 28 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600' },
  docDate: { fontSize: 12 },
  viewLink: { alignSelf: 'flex-start', marginTop: 8 },
  viewLinkText: { fontSize: 13, fontWeight: '500' },
  goldBanner: { borderRadius: 12, borderWidth: 1, padding: 12 },
  goldBannerText: { fontSize: 13, lineHeight: 18, color: '#92400e' },
  typeLabel: { fontSize: 13, fontWeight: '500', marginTop: -4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  typeChipActive: { backgroundColor: '#1B2D4F', borderColor: '#1B2D4F' },
  typeChipText: { fontSize: 13 },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
});
