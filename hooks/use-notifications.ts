import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import type { Notification } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

type NotificationListener = (notification: Notification) => void;

interface ChannelEntry {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<NotificationListener>;
}

const channelRegistry = new Map<string, ChannelEntry>();

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

// Module-level event bus so all hook instances stay in sync when read state changes
type ReadEvent = { type: 'mark_all' } | { type: 'mark_one'; id: string } | { type: 'delete'; id: string; wasUnread: boolean };
const readListeners = new Set<(event: ReadEvent) => void>();

function dispatchReadEvent(event: ReadEvent) {
  readListeners.forEach((l) => l(event));
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

  // Sync read state changes from any hook instance (e.g. tab bar badge vs screen)
  useEffect(() => {
    const handler = (event: ReadEvent) => {
      if (event.type === 'mark_all') {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } else if (event.type === 'mark_one') {
        setNotifications((prev) =>
          prev.map((n) => n.id === event.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else if (event.type === 'delete') {
        setNotifications((prev) => prev.filter((n) => n.id !== event.id));
        if (event.wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      }
    };
    readListeners.add(handler);
    return () => { readListeners.delete(handler); };
  }, []);

  useRefreshOnFocus(() => { if (user) fetch(); });

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
    dispatchReadEvent({ type: 'mark_all' });
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }

  async function markOneRead(id: string) {
    dispatchReadEvent({ type: 'mark_one', id });
    // Awaited so callers that navigate away right after (every notification
    // tap does) can wait for this to land first — otherwise a fast return to
    // this screen re-triggers useRefreshOnFocus before the write commits,
    // and the refetch pulls back the stale unread row, making the dot
    // reappear even though it was actually marked read.
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error('[markOneRead] error:', error.message);
  }

  async function deleteNotification(id: string) {
    const target = notifications.find((n) => n.id === id);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { console.error('[deleteNotification] error:', error.message); return; }
    dispatchReadEvent({ type: 'delete', id, wasUnread: target ? !target.is_read : false });
  }

  return { notifications, unreadCount, loading, markAllRead, markOneRead, deleteNotification, refresh: fetch };
}
