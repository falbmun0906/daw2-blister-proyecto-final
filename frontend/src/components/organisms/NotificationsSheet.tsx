import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../atoms/EmptyState';
import { ErrorState } from '../atoms/ErrorState';
import { Skeleton } from '../atoms/Skeleton';
import { useNotifications } from '../../hooks/use.notifications';
import { getNotificationTargetRoute } from '../../lib/notification-routing';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { NotificationView } from '../../types/notification.types';
import { NotificationItem } from './NotificationItem';

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

function getPortalTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.c-desktop-device-shell__screen') ?? document.body;
}

/**
 * Bottom sheet de notificaciones. Se monta siempre y se anima en funcion del
 * estado del store de UI; soporta arrastre vertical para cerrar acompasado
 * con el dedo, similar al patron de iOS.
 */
export function NotificationsSheet() {
  const navigate = useNavigate();
  const open = useUiStore((s) => s.notificationsSheetOpen);
  const close = useUiStore((s) => s.closeNotificationsSheet);
  const addToast = useUiStore((s) => s.addToast);
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, dismiss } =
    useNotifications();

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => groupByDate(notifications), [notifications]);
  const portalTarget = open ? getPortalTarget() : null;

  useEffect(() => {
    if (!open) {
      const timeoutId = window.setTimeout(() => {
        setDragOffset(0);
        setIsDragging(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const scrollTargets = [
      document.body,
      document.querySelector<HTMLElement>('.c-app-layout__main'),
      document.querySelector<HTMLElement>('.c-desktop-device-shell__screen'),
    ].filter((target): target is HTMLElement => target !== null);
    const previous = scrollTargets.map((target) => ({
      target,
      overflow: target.style.overflow,
      overscrollBehavior: target.style.overscrollBehavior,
    }));

    for (const target of scrollTargets) {
      target.style.overflow = 'hidden';
      target.style.overscrollBehavior = 'contain';
    }

    return () => {
      for (const item of previous) {
        item.target.style.overflow = item.overflow;
        item.target.style.overscrollBehavior = item.overscrollBehavior;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open, refetch]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const isHandle = Boolean(target.closest('.c-notifications-sheet__handle-area'));
    if (!isHandle && target.closest('button, a')) return;
    startY.current = event.clientY;
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    const bodyScrollTop = bodyRef.current?.scrollTop ?? 0;
    if (!isDragging) {
      if (delta <= 0 || bodyScrollTop > 0) return;
      setIsDragging(true);
    }
    event.preventDefault();
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
      addToast({ message: 'Notificaciones marcadas como leidas.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se han podido marcar todas como leidas.',
        variant: 'error',
      });
    }
  };

  const handleMarkAsRead = (id: string): void => {
    void markAsRead(id).catch((err) => {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido marcar como leida.',
        variant: 'error',
      });
    });
  };

  const handleOpenNotification = (notification: NotificationView): void => {
    const route = getNotificationTargetRoute(notification);
    if (!route) return;
    close();
    navigate(route);
  };

  const handleDismiss = (notification: NotificationView): void => {
    void dismiss(notification).catch((err) => {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar la notificacion.',
        variant: 'error',
      });
    });
  };

  if (!open || !portalTarget) return null;

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
        className={`c-notifications-sheet__panel${isDragging ? ' is-dragging' : ''}`}
        style={isDragging || dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="c-notifications-sheet__handle-area">
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
              Marcar todas como leidas
            </button>
          ) : null}
        </header>

        <div className="c-notifications-sheet__body" ref={bodyRef}>
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
                <div className="c-notifications-sheet__group-list">
                  {group.items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onOpen={handleOpenNotification}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
