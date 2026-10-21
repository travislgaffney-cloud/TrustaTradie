import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MAX_PHOTOS = 5;

interface Props {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string, photoUris: string[]) => void;
}

// Collects input only — uploading the photos, inserting the dispute_reports
// row, and the rest of the existing dispute flow (TradeSafe call, status
// transitions, notifications) all happen in the caller, same as before.
export function DisputeReportModal({ visible, submitting, onClose, onSubmit }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [reason, setReason] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  async function handleAddPhotos() {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photoUris.length,
    });
    if (result.canceled) return;
    setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  }

  function removePhoto(uri: string) {
    setPhotoUris((prev) => prev.filter((p) => p !== uri));
  }

  function handleSubmit() {
    if (!reason.trim()) {
      Alert.alert('Tell us what happened', 'Please describe the issue before submitting.');
      return;
    }
    onSubmit(reason.trim(), photoUris);
  }

  function handleClose() {
    setReason('');
    setPhotoUris([]);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} disabled={submitting}>
            <Text style={[styles.cancel, { color: colors.tint }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Raise a Dispute</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            This freezes the payment and notifies our admin team to investigate. Please only dispute if
            there is a genuine issue.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>What went wrong? *</Text>
          <TextInput
            style={[styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="Describe the issue in as much detail as you can — this is what our team reviews first."
            placeholderTextColor={colors.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text }]}>Photos (optional)</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Add up to {MAX_PHOTOS} photos showing the issue.
          </Text>

          <View style={styles.photoGrid}>
            {photoUris.map((uri) => (
              <View key={uri} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable style={styles.removeBtn} onPress={() => removePhoto(uri)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photoUris.length < MAX_PHOTOS && (
              <Pressable style={[styles.addPhotoBtn, { borderColor: colors.border }]} onPress={handleAddPhotos}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Add</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={[styles.submitBtn, { backgroundColor: Brand.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Dispute'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  cancel: { fontSize: 15 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 10 },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  hint: { fontSize: 12, marginBottom: 4 },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  photoWrap: { width: 72, height: 72 },
  photo: { width: 72, height: 72, borderRadius: 10 },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: { fontSize: 20 },
  addPhotoText: { fontSize: 11, marginTop: 2 },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
