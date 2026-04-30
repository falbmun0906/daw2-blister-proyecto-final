import { useCallback, useEffect, useState } from 'react';

import {
  deleteNotification,
  listNotifications,
  markNotificationAsRead,
} from '../services/notifications.service';
import { useNotificationsStore } from '../stores/notifications.store';
import { isApiError } from '../types/api.types';
import type {
  NotificationView,
  NotificationsListMeta,
} from '../types/notification.types';

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
}

interface UseNotificationsResult {
  notifications: NotificationView[];
  unreadCount: number;
  meta: NotificationsListMeta | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

/**
 * Carga notificaciones del usuario autenticado, las hidrata en el store global,
 * y expone una acción optimista para marcarlas como leídas.
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsResult {
  const { page = 1, limit = 20 } = options;
  const notifications = useNotificationsStore((s) => s.notifications);
  const setNotifications = useNotificationsStore((s) => s.setNotifications);
  const markRead = useNotificationsStore((s) => s.markRead);
  const removeNotification = useNotificationsStore((s) => s.remove);
  const [meta, setMeta] = useState<NotificationsListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listNotifications(page, limit);
      setNotifications(result.notifications);
      setMeta(result.meta);
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : 'No se han podido cargar las notificaciones.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, setNotifications]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const markAsRead = useCallback(
    async (id: string) => {
      const previous = useNotificationsStore.getState().notifications;
      markRead(id);
      try {
        await markNotificationAsRead(id);
      } catch (err) {
        setNotifications(previous);
        const message = isApiError(err)
          ? err.message
          : 'No se ha podido marcar la notificación como leída.';
        setError(message);
        throw err;
      }
    },
    [markRead, setNotifications],
  );

  const dismiss = useCallback(
    async (id: string) => {
      const previous = useNotificationsStore.getState().notifications;
      removeNotification(id);
      try {
        await deleteNotification(id);
      } catch (err) {
        setNotifications(previous);
        const message = isApiError(err)
          ? err.message
          : 'No se ha podido eliminar la notificación.';
        setError(message);
        throw err;
      }
    },
    [removeNotification, setNotifications],
  );

  const unreadCount = notifications.reduce(
    (acc, n) => (n.isRead ? acc : acc + 1),
    0,
  );

  return {
    notifications,
    unreadCount,
    meta,
    isLoading,
    error,
    refetch,
    markAsRead,
    dismiss,
  };
}
