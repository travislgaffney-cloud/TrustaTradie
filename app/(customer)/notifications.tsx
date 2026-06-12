import { format } from 'date-fns';
import React, { useEffect } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';

const TYPE_ICONS: Record<string, string> = {
  new_job_nearby: '📍',
  new_quote_received: '💬',
  quote_accepted: '✅',
  quote_rejected: '❌',
  job_completed: '🎉',
  payment_released: '💰',
  new_message: '✉️',
  rating_received: '⭐',
};

export default function CustomerNotificationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { notifications, loading, markAllRead, refresh } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications yet" description="You'll be notified of new quotes, messages, and job updates here." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          renderItem={({ item }) => (
            <View style={[
              styles.item,
              { borderBottomColor: colors.border, backgroundColor: item.is_read ? 'transparent' : colors.surface },
            ]}>
              <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.itemBody, { color: colors.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                  {format(new Date(item.created_at), 'dd MMM · HH:mm')}
                </Text>
              </View>
              {!item.is_read && <View style={[styles.dot, { backgroundColor: colors.tint }]} />}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  icon: { fontSize: 24, marginTop: 2 },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemBody: { fontSize: 13, lineHeight: 18 },
  itemTime: { fontSize: 11, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
