import { useEffect, useRef, useState } from 'react';

import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Modal } from '../atoms/Modal';

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
  if (!isOpen) return null;

  return <ForceDoseDialogContent onConfirm={onConfirm} onCancel={onCancel} />;
}

function ForceDoseDialogContent({
  onConfirm,
  onCancel,
}: Pick<ForceDoseDialogProps, 'onConfirm' | 'onCancel'>) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleConfirm = (): void => {
    const trimmed = notes.trim();
    if (trimmed.length === 0) {
      setError('Indica un motivo para registrar la toma sin stock suficiente.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal open onClose={onCancel} title="Stock insuficiente">
      <div className="c-force-dose-dialog">
        <p className="c-force-dose-dialog__message">
          No queda suficiente stock para esta toma. Puedes registrarla igualmente
          dejando una nota explicativa para el equipo.
        </p>
        <Input
          ref={inputRef}
          label="Motivo (obligatorio)"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
          hint="Ejemplo: se ha tomado fuera de casa y el stock aún no se había actualizado."
          placeholder="Añade una nota breve para el equipo"
          maxLength={500}
        />
        <div className="c-force-dose-dialog__actions">
          <Button variant="primary-outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Registrar igualmente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
