import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieDocuments } from '@/hooks/use-tradie-profile';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/store/auth-store';

export default function DocumentsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { documents, loading, refresh } = useTradieDocuments();
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!user || !label.trim()) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled) return;
    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.name.split('.').pop() ?? 'pdf';
    const path = `${user.id}/${Date.now()}_${asset.name}`;
    const url = await uploadFile('documents', path, asset.uri, asset.mimeType ?? 'application/pdf');
    await supabase.from('tradie_documents').insert({
      tradie_id: user.id,
      type: 'certificate',
      label: label.trim(),
      url,
    });
    setLabel('');
    await refresh();
    setUploading(false);
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
        <View style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload a new document</Text>
          <Input label="Document label" placeholder="e.g. Electrical COC, Trade Certificate, Insurance" value={label} onChangeText={setLabel} />
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
                    {new Date(doc.created_at).toLocaleDateString('en-ZA')}
                  </Text>
                </View>
                {doc.is_verified ? (
                  <Badge label="✓ Verified" variant="success" />
                ) : (
                  <Badge label="Pending" variant="warning" />
                )}
              </View>
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
});
