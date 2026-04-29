import DOMPurify from 'dompurify';

import type { NotificationView } from '../../types/notification.types';

interface NotificationItemProps {
  notification: NotificationView;
  onMarkAsRead: (id: string) => void;
}

const TYPE_ICONS: Record<NotificationView['type'], string> = {
  stock_low: '📦',
  expiration_warning: '⏳',
  adherence_forced: '💊',
  cima_change: '⚠️',
  system: '🔔',
};

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('es-ES', {
  numeric: 'auto',
});

const RELATIVE_TIME_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

function formatRelativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '';
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      const value = Math.round(diffSeconds / seconds);
      return RELATIVE_TIME_FORMATTER.format(value, unit);
    }
  }
  return '';
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const safeTitle = DOMPurify.sanitize(notification.title);
  const safeMessage = DOMPurify.sanitize(notification.message);
  const icon = TYPE_ICONS[notification.type];
  const relativeTime = formatRelativeTime(notification.createdAt);
  const className = [
    'c-notification-item',
    !notification.isRead && 'c-notification-item--unread',
    `c-notification-item--${notification.severity}`,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (!notification.isRead) onMarkAsRead(notification.id);
  };

  return (
    <article className={className}>
      <button
        type="button"
        className="c-notification-item__button"
        onClick={handleClick}
        aria-label={
          notification.isRead
            ? `Notificación: ${notification.title}`
            : `Marcar como leída: ${notification.title}`
        }
      >
        <span className="c-notification-item__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="c-notification-item__body">
          <span className="c-notification-item__title">{safeTitle}</span>
          <span className="c-notification-item__message">{safeMessage}</span>
          <time
            className="c-notification-item__time"
            dateTime={notification.createdAt}
          >
            {relativeTime}
          </time>
        </span>
        {!notification.isRead ? (
          <span
            className="c-notification-item__indicator"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </article>
  );
}
