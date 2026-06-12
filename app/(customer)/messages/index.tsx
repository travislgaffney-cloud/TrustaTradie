import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConversations } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerMessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const { conversations, loading, refresh } = useConversations();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : conversations.length === 0 ? (
        <EmptyState icon="💬" title="No messages yet" description="When you accept a quote, you can chat with the tradie here." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          renderItem={({ item }) => {
            const other = item.customer_id === user?.id ? item.tradie : item.customer;
            return (
              <Pressable
                onPress={() => router.push(`/(customer)/messages/${item.id}`)}
                style={[styles.item, { borderBottomColor: colors.border }]}
              >
                <Avatar uri={other?.avatar_url} name={other?.full_name} size={48} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.name, { color: colors.text }]}>{other?.full_name}</Text>
                  <Text style={[styles.jobTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.job?.title ?? 'Job'}
                  </Text>
                </View>
                {item.last_message_at && (
                  <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  jobTitle: { fontSize: 13 },
  time: { fontSize: 11 },
});
