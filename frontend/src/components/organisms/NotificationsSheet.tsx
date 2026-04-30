import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { EmptyState } from '../atoms/EmptyState';
import { ErrorState } from '../atoms/ErrorState';
import { Skeleton } from '../atoms/Skeleton';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '../../hooks/use.notifications';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { NotificationView } from '../../types/notification.types';

interface NotificationGroup {
  key: 'today' | 'week' | 'older';
  label: string;
  items: NotificationView[];
}

function groupByDate(items: NotificationView[]): NotificationGroup[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const today: NotificationView[] = [];
  const week: NotificationView[] = [];
  const older: NotificationView[] = [];
  for (const item of items) {
    const diff = now - new Date(item.createdAt).getTime();
    if (diff < dayMs) today.push(item);
    else if (diff < dayMs * 7) week.push(item);
    else older.push(item);
  }
  return [
    { key: 'today' as const, label: 'Hoy', items: today },
    { key: 'week' as const, label: 'Esta semana', items: week },
    { key: 'older' as const, label: 'Anteriores', items: older },
  ].filter((g) => g.items.length > 0);
}

const CLOSE_THRESHOLD_PX = 120;

/**
 * Bottom sheet de notificaciones. Se monta siempre y se anima en función del
 * estado del store de UI; soporta arrastre vertical para cerrar acompañando
 * al dedo, similar al patrón de iOS.
 */
export function NotificationsSheet() {
  const open = useUiStore((s) => s.notificationsSheetOpen);
  const close = useUiStore((s) => s.closeNotificationsSheet);
  const addToast = useUiStore((s) => s.addToast);
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead } =
    useNotifications();

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setIsDragging(false);
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  // Refresca al abrir.
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    setIsDragging(true);
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    setDragOffset(Math.max(0, delta));
  };

  const handlePointerUp = () => {
    if (dragOffset > CLOSE_THRESHOLD_PX) {
      close();
    } else {
      setDragOffset(0);
    }
    startY.current = null;
    setIsDragging(false);
  };

  const handleMarkAll = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => markAsRead(n.id)));
      addToast({ message: 'Notificaciones marcadas como leídas.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se han podido marcar todas como leídas.',
        variant: 'error',
      });
    }
  };

  const handleMarkAsRead = (id: string): void => {
    void markAsRead(id).catch((err) => {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido marcar como leída.',
        variant: 'error',
      });
    });
  };

  return createPortal(
    <div
      className={`c-notifications-sheet${open ? ' is-open' : ''}`}
      aria-hidden={!open}
    >
      <div
        className="c-notifications-sheet__backdrop"
        onClick={close}
      />
      <div
        ref={sheetRef}
        className={`c-notifications-sheet__panel${isDragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateY(${dragOffset}px)` }}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
      >
        <div
          className="c-notifications-sheet__handle-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className="c-notifications-sheet__handle" aria-hidden="true" />
        </div>

        <header className="c-notifications-sheet__header">
          <h2 className="c-notifications-sheet__title">Notificaciones</h2>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="c-notifications-sheet__mark-all"
              onClick={() => void handleMarkAll()}
            >
              Marcar todas como leídas
            </button>
          ) : null}
        </header>

        <div className="c-notifications-sheet__body">
          {isLoading ? (
            <>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void refetch()} />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No tienes notificaciones"
              description="Te avisaremos cuando haya stock bajo, tomas forzadas o cambios en CIMA."
            />
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h3 className="c-notifications-sheet__group-title">{group.label}</h3>
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
