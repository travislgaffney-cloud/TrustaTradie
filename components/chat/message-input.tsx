import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { uploadFile } from '@/lib/storage';

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  onSend: (params: { content?: string; attachmentUrl?: string; attachmentType?: string }) => Promise<void>;
  onBook?: () => void;
}

export function MessageInput({ conversationId, senderId, onSend, onBook }: MessageInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const canSend = text.trim().length > 0 && !uploading;

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await onSend({ content: trimmed });
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${conversationId}/${senderId}_${Date.now()}.${ext}`;
      const url = await uploadFile('chat-attachments', path, asset.uri, `image/${ext}`);
      await onSend({ attachmentUrl: url, attachmentType: 'image' });
    } finally {
      setUploading(false);
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.name.split('.').pop() ?? 'pdf';
      const path = `${conversationId}/${senderId}_${Date.now()}.${ext}`;
      const url = await uploadFile('chat-attachments', path, asset.uri, asset.mimeType ?? 'application/octet-stream');
      await onSend({ attachmentUrl: url, attachmentType: ext === 'pdf' ? 'pdf' : 'document' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Attachment / booking buttons */}
      <Pressable onPress={pickImage} style={styles.attachBtn} disabled={uploading}>
        <Text style={styles.attachIcon}>🖼️</Text>
      </Pressable>
      <Pressable onPress={pickDocument} style={styles.attachBtn} disabled={uploading}>
        <Text style={styles.attachIcon}>📎</Text>
      </Pressable>
      {onBook && (
        <Pressable onPress={onBook} style={styles.attachBtn} disabled={uploading}>
          <Text style={styles.attachIcon}>📅</Text>
        </Pressable>
      )}

      {/* Text input */}
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        placeholder="Message..."
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        returnKeyType={Platform.OS === 'ios' ? 'send' : 'default'}
        blurOnSubmit={false}
        onSubmitEditing={Platform.OS === 'ios' ? handleSend : undefined}
      />

      {/* Send / upload indicator */}
      {uploading ? (
        <View style={[styles.sendBtn, { backgroundColor: Brand.primary }]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : (
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? Brand.primary : colors.border },
          ]}
        >
          <Text style={styles.sendArrow}>➤</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 130,
    lineHeight: 20,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendArrow: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 2 },
});
