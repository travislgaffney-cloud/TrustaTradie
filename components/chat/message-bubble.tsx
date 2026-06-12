import { format } from 'date-fns';
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '@/types/database';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {message.content && (
          <Text style={[styles.text, isOwn && styles.textOwn]}>{message.content}</Text>
        )}
        {message.attachment_url && message.attachment_type === 'image' && (
          <Image source={{ uri: message.attachment_url }} style={styles.attachImage} />
        )}
        {message.attachment_url && message.attachment_type !== 'image' && (
          <Pressable onPress={() => Linking.openURL(message.attachment_url!)}>
            <Text style={styles.attachLink}>📎 View attachment</Text>
          </Pressable>
        )}
        <Text style={[styles.time, isOwn && styles.timeOwn]}>
          {format(new Date(message.created_at), 'HH:mm')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginVertical: 2, alignItems: 'flex-start' },
  wrapperOwn: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 10,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: '#F97316',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, color: '#0f172a', lineHeight: 20 },
  textOwn: { color: '#fff' },
  time: { fontSize: 11, color: '#94a3b8' },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  attachImage: { width: 200, height: 150, borderRadius: 8, resizeMode: 'cover' },
  attachLink: { color: '#3b82f6', fontSize: 14, textDecorationLine: 'underline' },
});
