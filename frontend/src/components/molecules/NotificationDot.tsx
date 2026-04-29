interface NotificationDotProps {
  count: number;
}

/**
 * Indicador circular del número de notificaciones no leídas.
 * Se oculta del DOM cuando `count` es 0 para no contaminar lectores de pantalla.
 */
export function NotificationDot({ count }: NotificationDotProps) {
  if (count <= 0) return null;
  const label =
    count === 1
      ? '1 notificación sin leer'
      : `${count} notificaciones sin leer`;
  const text = count > 9 ? '9+' : String(count);
  return (
    <span className="c-notification-dot" role="status" aria-label={label}>
      <span className="c-notification-dot__count" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
