import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { BookingProposalCard } from '@/components/chat/booking-proposal-card';
import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageInput } from '@/components/chat/message-input';
import { DateTimePickerModal } from '@/components/ui/date-time-picker-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMessages } from '@/hooks/use-messages';
import { useBookingProposals } from '@/hooks/use-calendar';
import { useAuthStore } from '@/store/auth-store';
import type { BookingProposal, LocalMessage } from '@/types/database';

type ChatItem =
  | { kind: 'message'; id: string; ts: number; data: LocalMessage }
  | { kind: 'proposal'; id: string; ts: number; data: BookingProposal };

export default function CustomerChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { messages, conversation, loading, sendMessage } = useMessages(conversationId);
  const { proposals, proposeBooking, respondToProposal } = useBookingProposals(conversationId);
  const listRef = useRef<FlatList>(null);
  const [showPicker, setShowPicker] = useState(false);

  const other = conversation
    ? (conversation.customer_id === user?.id ? conversation.tradie : conversation.customer)
    : null;

  const timeline = useMemo((): ChatItem[] => {
    const items: ChatItem[] = [
      ...messages.map((m) => ({ kind: 'message' as const, id: m.id, ts: new Date(m.created_at).getTime(), data: m })),
      ...proposals.map((p) => ({ kind: 'proposal' as const, id: p.id, ts: new Date(p.created_at).getTime(), data: p })),
    ];
    return items.sort((a, b) => a.ts - b.ts);
  }, [messages, proposals]);

  const recipientId = conversation?.customer_id === user?.id
    ? conversation?.tradie_id
    : conversation?.customer_id;

  async function handleDateConfirm(date: Date) {
    if (!conversation?.job_id || !recipientId) return;
    await proposeBooking(conversation.job_id, date, recipientId);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Avatar uri={other?.avatar_url} name={other?.full_name} size={36} color="#38BDF8" />
            <View>
              <Text style={styles.headerName} numberOfLines={1}>{other?.full_name ?? 'Chat'}</Text>
              {conversation?.job?.title && (
                <Text style={styles.headerJob} numberOfLines={1}>{conversation.job.title}</Text>
              )}
            </View>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {loading ? (
          <LoadingSpinner full />
        ) : (
          <FlatList
            ref={listRef}
            data={timeline}
            keyExtractor={(item) => `${item.kind}-${item.id}`}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if (item.kind === 'proposal') {
                const p = item.data;
                const isOwn = p.proposed_by === user?.id;
                return (
                  <BookingProposalCard
                    proposal={p}
                    isOwn={isOwn}
                    onAccept={() => respondToProposal(p, true, p.proposed_by)}
                    onDecline={() => respondToProposal(p, false, p.proposed_by)}
                  />
                );
              }
              const m = item.data;
              return (
                <MessageBubble
                  message={m}
                  isOwn={m.sender_id === user?.id}
                  pending={!!m._pending}
                  otherAvatar={other?.avatar_url}
                  otherName={other?.full_name}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>👋</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No messages yet.{'\n'}Say hello to get started!
                </Text>
              </View>
            }
          />
        )}

        {user && (
          <MessageInput
            conversationId={conversationId}
            senderId={user.id}
            onSend={sendMessage}
            onBook={conversation?.job_id ? () => setShowPicker(true) : undefined}
          />
        )}
      </KeyboardAvoidingView>

      <DateTimePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={handleDateConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { width: 60 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  headerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerJob: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  list: { paddingVertical: 12, paddingHorizontal: 4, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
