import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageInput } from '@/components/chat/message-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMessages } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';

export default function TradieChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Chat</Text>
          <View style={{ width: 60 }} />
        </View>
        {loading ? <LoadingSpinner full /> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }) => <MessageBubble message={item} isOwn={item.sender_id === user?.id} />}
          />
        )}
        {user && <MessageInput conversationId={conversationId} senderId={user.id} onSend={sendMessage} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
});
