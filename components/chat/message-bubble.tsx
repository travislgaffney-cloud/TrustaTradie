import { format } from 'date-fns';
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import type { Message } from '@/types/database';

// pending  → 1 grey tick  (sent to server, awaiting confirmation)
// delivered → 2 grey ticks (confirmed in DB, recipient hasn't opened yet)
// read      → 2 blue ticks (recipient opened the conversation)
function Ticks({ pending, isRead }: { pending: boolean; isRead: boolean }) {
  if (pending) {
    return <Text style={styles.tickGray}>✓</Text>;
  }
  if (isRead) {
    return (
      <View style={styles.tickRow}>
        <Text style={styles.tickBlue}>✓</Text>
        <Text style={[styles.tickBlue, styles.tickOverlap]}>✓</Text>
      </View>
    );
  }
  return (
    <View style={styles.tickRow}>
      <Text style={styles.tickGray}>✓</Text>
      <Text style={[styles.tickGray, styles.tickOverlap]}>✓</Text>
    </View>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  pending?: boolean;
  otherAvatar?: string | null;
  otherName?: string | null;
}

export function MessageBubble({ message, isOwn, pending = false, otherAvatar, otherName }: MessageBubbleProps) {
  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {!isOwn && (
        <Avatar uri={otherAvatar} name={otherName} size={30} style={styles.avatar} />
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {message.content && (
          <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
            {message.content}
          </Text>
        )}
        {message.attachment_url && message.attachment_type === 'image' && (
          <Pressable onPress={() => Linking.openURL(message.attachment_url!)}>
            <Image source={{ uri: message.attachment_url }} style={styles.attachImage} />
          </Pressable>
        )}
        {message.attachment_url && message.attachment_type !== 'image' && (
          <Pressable
            style={[styles.fileAttach, isOwn ? styles.fileAttachOwn : styles.fileAttachOther]}
            onPress={() => Linking.openURL(message.attachment_url!)}
          >
            <Text style={styles.fileIcon}>📎</Text>
            <Text style={[styles.fileText, isOwn && { color: 'rgba(255,255,255,0.9)' }]}>
              View attachment
            </Text>
          </Pressable>
        )}

        {/* Time + delivery ticks */}
        <View style={[styles.footer, isOwn ? styles.footerOwn : styles.footerOther]}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {format(new Date(message.created_at), 'HH:mm')}
          </Text>
          {isOwn && (
            <Ticks pending={pending} isRead={message.is_read} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    paddingHorizontal: 12,
    gap: 6,
  },
  wrapperOwn: { justifyContent: 'flex-end' },
  wrapperOther: { justifyContent: 'flex-start' },
  avatar: { marginBottom: 2 },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleOwn: {
    backgroundColor: '#F97316',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 21 },
  textOwn: { color: '#fff' },
  textOther: { color: '#0f172a' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerOwn: { justifyContent: 'flex-end' },
  footerOther: { justifyContent: 'flex-start' },
  time: { fontSize: 10 },
  timeOwn: { color: 'rgba(255,255,255,0.65)' },
  timeOther: { color: '#94a3b8' },
  // ticks
  tickRow: { flexDirection: 'row' },
  tickOverlap: { marginLeft: -3 },
  tickGray: { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 14 },
  tickBlue: { fontSize: 11, color: '#93C5FD', lineHeight: 14 },
  // attachments
  attachImage: { width: 200, height: 150, borderRadius: 10, resizeMode: 'cover' },
  fileAttach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  fileAttachOwn: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileAttachOther: { backgroundColor: 'rgba(0,0,0,0.05)' },
  fileIcon: { fontSize: 16 },
  fileText: { fontSize: 13, color: '#334155', textDecorationLine: 'underline' },
});
