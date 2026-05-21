import { useEffect, useRef, useState } from 'react';
import {
  TbAlertTriangle,
  TbCircleCheck,
  TbCircleX,
  TbInfoCircle,
  TbX,
} from 'react-icons/tb';

import { useUiStore, type ToastItem, type ToastVariant } from '../../stores/ui.store';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const VARIANT_ICON: Record<ToastVariant, React.ComponentType<{ 'aria-hidden'?: boolean }>> = {
  success: TbCircleCheck,
  error: TbCircleX,
  warning: TbAlertTriangle,
  info: TbInfoCircle,
};

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = VARIANT_ICON[toast.variant];
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Programa el cierre automático y dispara la animación de salida
  // un poco antes de retirar el toast del DOM, así no desaparece "de golpe".
  useEffect(() => {
    const exitDelay = 220; // debe coincidir con la animación CSS de salida.
    timerRef.current = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => onDismiss(toast.id), exitDelay);
    }, Math.max(0, toast.durationMs - exitDelay));
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.durationMs, onDismiss]);

  const handleClose = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), 220);
  };

  return (
    <div
      className={[
        'c-toast',
        `c-toast--${toast.variant}`,
        leaving && 'is-leaving',
      ].filter(Boolean).join(' ')}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="c-toast__icon" aria-hidden="true">
        <Icon aria-hidden />
      </span>
      <p className="c-toast__message">{toast.message}</p>
      <button
        type="button"
        className="c-toast__close"
        aria-label="Cerrar aviso"
        onClick={handleClose}
      >
        <TbX aria-hidden="true" />
      </button>
      <span
        className="c-toast__progress"
        aria-hidden="true"
        style={{ animationDuration: `${toast.durationMs}ms` }}
      />
    </div>
  );
}

/** Renderiza la cola de toasts globales del `useUiStore`. */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="c-toaster" aria-label="Avisos">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
