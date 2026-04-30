import { useMemo } from 'react';

import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { NotificationItem } from '../../components/organisms/NotificationItem';
import { useNotifications } from '../../hooks/use.notifications';
import { usePageTitle } from '../../hooks/use.page-title';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { NotificationView } from '../../types/notification.types';
import './NotificationsPage.scss';

interface NotificationGroup {
  key: 'today' | 'week' | 'older';
  label: string;
  items: NotificationView[];
}

function groupByDate(items: NotificationView[]): NotificationGroup[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayItems: NotificationView[] = [];
  const weekItems: NotificationView[] = [];
  const olderItems: NotificationView[] = [];

  for (const item of items) {
    const created = new Date(item.createdAt).getTime();
    const diff = now - created;
    if (diff < dayMs) todayItems.push(item);
    else if (diff < dayMs * 7) weekItems.push(item);
    else olderItems.push(item);
  }

  return [
    { key: 'today' as const, label: 'Hoy', items: todayItems },
    { key: 'week' as const, label: 'Esta semana', items: weekItems },
    { key: 'older' as const, label: 'Anteriores', items: olderItems },
  ].filter((g) => g.items.length > 0);
}

function NotificationsPage() {
  usePageTitle('Avisos');
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead } =
    useNotifications();
  const addToast = useUiStore((s) => s.addToast);

  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  const handleMarkAll = async (): Promise<void> => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => markAsRead(n.id)));
      addToast({ message: 'Notificaciones marcadas como leídas.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : 'No se han podido marcar todas como leídas.';
      addToast({ message, variant: 'error' });
    }
  };

  const handleMarkAsRead = (id: string): void => {
    void markAsRead(id).catch((err) => {
      const message = isApiError(err)
        ? err.message
        : 'No se ha podido marcar como leída.';
      addToast({ message, variant: 'error' });
    });
  };

  return (
    <section className="c-notifications-page" aria-label="Listado de notificaciones">
      {unreadCount > 0 ? (
        <header className="c-notifications-page__header">
          <button
            type="button"
            className="c-notifications-page__mark-all"
            onClick={() => void handleMarkAll()}
          >
            Marcar todas como leídas
          </button>
        </header>
      ) : null}

      {isLoading ? (
        <div className="c-notifications-page__list" aria-busy="true">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No tienes notificaciones"
          description="Te avisaremos cuando haya stock bajo, tomas forzadas o cambios en CIMA."
        />
      ) : (
        <div className="c-notifications-page__list">
          {groups.map((group) => (
            <section
              key={group.key}
              className="c-notifications-page__group"
              aria-label={group.label}
            >
              <h2 className="c-notifications-page__group-title">{group.label}</h2>
              {group.items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
