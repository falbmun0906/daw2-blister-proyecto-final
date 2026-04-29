import { useEffect, useState } from 'react';

import { ADHERENCE_UNDO_WINDOW_MS } from '../../constants/ui.constants';

interface UndoToastProps {
  /** ID del log creado, identifica la operación a deshacer. */
  logId: string;
  /** Mensaje principal mostrado al usuario. */
  message: string;
  /** Timestamp en ms cuando el log se creó (para calcular el tiempo restante). */
  createdAt: number;
  /** Callback al pulsar "Deshacer". El padre llama a `undoLog(logId)`. */
  onUndo: (logId: string) => void;
  /** Callback al expirar la ventana de 10 minutos. */
  onExpire: (logId: string) => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Toast especializado con cuenta atrás que aparece tras registrar una toma.
 * Mientras dura la ventana de undo (`ADHERENCE_UNDO_WINDOW_MS`) ofrece el
 * botón "Deshacer". Al expirar, dispara `onExpire` para que el padre la
 * desmonte y la acción se vuelve irreversible.
 */
export function UndoToast({ logId, message, createdAt, onUndo, onExpire }: UndoToastProps) {
  const expiresAt = createdAt + ADHERENCE_UNDO_WINDOW_MS;
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = Math.max(0, expiresAt - Date.now());
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(interval);
        onExpire(logId);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, logId, onExpire]);

  if (remaining <= 0) return null;

  return (
    <div className="c-undo-toast" role="status" aria-live="polite">
      <p className="c-undo-toast__message">{message}</p>
      <span className="c-undo-toast__timer" aria-label="Tiempo restante para deshacer">
        {formatRemaining(remaining)}
      </span>
      <button
        type="button"
        className="c-undo-toast__action"
        onClick={() => onUndo(logId)}
      >
        Deshacer
      </button>
    </div>
  );
}
