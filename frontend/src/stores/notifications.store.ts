import { create } from 'zustand';

import type { NotificationView } from '../types/notification.types';

interface NotificationsState {
  notifications: NotificationView[];
  setNotifications: (items: NotificationView[]) => void;
  markRead: (id: string) => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  setNotifications: (items) => set({ notifications: items }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    })),
  reset: () => set({ notifications: [] }),
}));

/** Selector reactivo: número de notificaciones no leídas. */
export const useUnreadNotificationsCount = (): number =>
  useNotificationsStore((state) =>
    state.notifications.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0),
  );
