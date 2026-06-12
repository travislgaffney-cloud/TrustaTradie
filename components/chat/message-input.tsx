import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
}

export function MessageInput({ conversationId, senderId, onSend }: MessageInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);

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
      const type = ext === 'pdf' ? 'pdf' : 'document';
      await onSend({ attachmentUrl: url, attachmentType: type });
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Pressable onPress={pickImage} style={styles.iconBtn} disabled={uploading}>
        <Text style={styles.iconText}>🖼️</Text>
      </Pressable>
      <Pressable onPress={pickDocument} style={styles.iconBtn} disabled={uploading}>
        <Text style={styles.iconText}>📎</Text>
      </Pressable>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
      />
      {uploading ? (
        <ActivityIndicator color={Brand.primary} style={styles.sendBtn} />
      ) : (
        <Pressable
          onPress={handleSend}
          style={[styles.sendBtn, { backgroundColor: Brand.primary }]}
          disabled={!text.trim()}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  iconBtn: { padding: 6, alignSelf: 'flex-end', paddingBottom: 10 },
  iconText: { fontSize: 22 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
