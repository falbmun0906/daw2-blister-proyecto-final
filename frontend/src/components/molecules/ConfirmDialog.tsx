import { useState } from 'react';

import { Button } from '../atoms/Button';
import { Modal } from '../atoms/Modal';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  ariaLabel?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm,
  ariaLabel = 'Confirmar acción',
  cancelLabel = 'Conservar',
  confirmLabel = 'Sí, eliminar',
  destructive = true,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onCancel} hideHeader ariaLabel={ariaLabel} disableBackdropClose={busy}>
      <p className="c-confirm-modal__message">{message}</p>
      <div className="c-confirm-modal__actions">
        <Button type="button" variant="primary-outline" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'danger' : 'primary'}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onCancel();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
