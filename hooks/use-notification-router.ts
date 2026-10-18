import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getNotificationRoute } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';
import type { NotificationType } from '@/types/database';

/**
 * Routes taps on OS-level push notifications (banner, tray, cold start) using the
 * same type/data → route mapping as the in-app alerts list, so `?from=notifications`
 * back-nav works no matter how the screen was opened.
 */
export function useNotificationRouter() {
  const role = useAuthStore((s) => s.role);
  const roleRef = useRef(role);
  roleRef.current = role;
  const pendingData = useRef<{ type: NotificationType; data: Record<string, string> } | null>(null);

  useEffect(() => {
    function route(type: NotificationType, data: Record<string, string>) {
      const currentRole = roleRef.current;
      if (currentRole !== 'customer' && currentRole !== 'tradie') {
        pendingData.current = { type, data };
        return;
      }
      const path = getNotificationRoute(type, data, currentRole);
      if (path) router.push(path as never);
    }

    function handleResponse(response: Notifications.NotificationResponse) {
      const content = response.notification.request.content.data as Record<string, string> | undefined;
      if (!content?.type) return;
      route(content.type as NotificationType, content);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if ((role === 'customer' || role === 'tradie') && pendingData.current) {
      const { type, data } = pendingData.current;
      pendingData.current = null;
      const path = getNotificationRoute(type, data, role);
      if (path) router.push(path as never);
    }
  }, [role]);
}
