import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConversations } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerMessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user, profile } = useAuthStore();
  const { conversations, loading, refresh } = useConversations();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Chats</Text>
            <Text style={styles.headerSubtitle}>Your conversations with tradies</Text>
          </View>
          <Pressable onPress={() => router.push('/(customer)/profile')}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={36} color="#38BDF8" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No chats yet"
          description="Find a tradie nearby and tap Message to start a conversation."
        />
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
                    {item.job?.title ?? 'Direct message'}
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
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: { flex: 1, gap: 4 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
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
