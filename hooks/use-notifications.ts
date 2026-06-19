import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

type NotificationListener = (notification: Notification) => void;

interface ChannelEntry {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<NotificationListener>;
}

const channelRegistry = new Map<string, ChannelEntry>();

// Multiple components call useNotifications() for the same user (tab bar badge +
// alerts screen). Realtime channels with the same topic can't have postgres_changes
// callbacks added after subscribe(), so share a single channel/subscription per user.
function subscribeToNotifications(userId: string, listener: NotificationListener) {
  let entry = channelRegistry.get(userId);
  if (!entry) {
    const listeners = new Set<NotificationListener>();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        listeners.forEach((l) => l(payload.new as Notification));
      })
      .subscribe();
    entry = { channel, listeners };
    channelRegistry.set(userId, entry);
  }
  entry.listeners.add(listener);

  return () => {
    entry!.listeners.delete(listener);
    if (entry!.listeners.size === 0) {
      supabase.removeChannel(entry!.channel);
      channelRegistry.delete(userId);
    }
  };
}

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch();
    return subscribeToNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    });
  }, [user]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data as Notification[]) ?? [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
    setLoading(false);
  }

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function deleteNotification(id: string) {
    const target = notifications.find((n) => n.id === id);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { console.error('[deleteNotification] error:', error.message); return; }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.is_read) setUnreadCount((c) => Math.max(0, c - 1));
  }

  return { notifications, unreadCount, loading, markAllRead, deleteNotification, refresh: fetch };
}
