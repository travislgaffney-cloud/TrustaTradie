import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/types/database';

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

function handleNotificationPress(n: Notification) {
  const data = n.data as Record<string, string> | null;
  switch (n.type) {
    case 'quote_accepted':
      if (data?.job_id) router.push(`/(tradie)/active-jobs/${data.job_id}` as never);
      break;
    case 'payment_released':
      router.push('/(tradie)/earnings' as never);
      break;
    case 'new_job_nearby':
      router.push('/(tradie)/home' as never);
      break;
    case 'new_message':
      if (data?.conversation_id) router.push(`/(tradie)/messages/${data.conversation_id}` as never);
      break;
    default:
      break;
  }
}

function NotificationRow({
  item,
  onDelete,
  onRead,
  colors,
}: {
  item: Notification;
  onDelete: () => void;
  onRead: () => void;
  colors: any;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const renderRightActions = useCallback(() => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        swipeableRef.current?.close();
        onDelete();
      }}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteLabel}>Delete</Text>
    </Pressable>
  ), [onDelete]);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={72}
      renderRightActions={renderRightActions}
    >
      <Pressable
        onPress={() => { onRead(); handleNotificationPress(item); }}
        style={[
          styles.item,
          { borderBottomColor: colors.border, backgroundColor: item.is_read ? colors.background : colors.surface },
        ]}
      >
        <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.itemBody, { color: colors.textSecondary }]}>{item.body}</Text>
          <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
            {format(new Date(item.created_at), 'dd MMM · HH:mm')}
          </Text>
        </View>
        {!item.is_read && <View style={[styles.dot, { backgroundColor: Brand.primary }]} />}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

export default function TradieNotificationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { notifications, loading, markAllRead, markOneRead, deleteNotification, refresh } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: Brand.secondary }]}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>Swipe left to delete · Tap to take action</Text>
      </View>

      {loading ? (
        <LoadingSpinner full />
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications yet" description="You'll be notified when quotes are accepted, payments released, and more." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Brand.primary} />}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onDelete={() => deleteNotification(item.id)}
              onRead={() => markOneRead(item.id)}
              colors={colors}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
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
  deleteAction: {
    backgroundColor: '#ef4444',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
