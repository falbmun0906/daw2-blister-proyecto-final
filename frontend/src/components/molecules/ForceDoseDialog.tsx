import { useEffect, useRef, useState } from 'react';

import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

interface ForceDoseDialogProps {
  isOpen: boolean;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
}

/**
 * Diálogo modal que se abre cuando el backend devuelve `422
 * ADHERENCE_STOCK_INSUFFICIENT`. Pide confirmación + nota obligatoria
 * antes de relanzar la creación del log con `force: true`.
 */
export function ForceDoseDialog({ isOpen, onConfirm, onCancel }: ForceDoseDialogProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError(null);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = (): void => {
    const trimmed = notes.trim();
    if (trimmed.length === 0) {
      setError('Indica un motivo para registrar la toma sin stock suficiente.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="c-force-dose-dialog" role="dialog" aria-modal="true" aria-labelledby="force-dose-title">
      <div className="c-force-dose-dialog__backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="c-force-dose-dialog__panel">
        <h2 id="force-dose-title" className="c-force-dose-dialog__title">
          Stock insuficiente
        </h2>
        <p className="c-force-dose-dialog__message">
          No queda suficiente stock para esta toma. Puedes registrarla igualmente
          dejando una nota explicativa para el equipo.
        </p>
        <Input
          ref={inputRef}
          label="Motivo (obligatorio)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={error ?? undefined}
          maxLength={500}
        />
        <div className="c-force-dose-dialog__actions">
          <Button variant="ghost" className="c-btn--card" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" className="c-btn--card" onClick={handleConfirm}>
            Registrar igualmente
          </Button>
        </div>
      </div>
    </div>
  );
}
