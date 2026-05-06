import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TbX } from 'react-icons/tb';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  disableBackdropClose?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}

function getPortalTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.c-desktop-device-shell__screen') ?? document.body;
}

export function Modal({
  open,
  onClose,
  title,
  hideHeader,
  hideCloseButton,
  disableBackdropClose,
  children,
  ariaLabel,
}: ModalProps) {
  const portalTarget = open ? getPortalTarget() : null;

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      className="c-modal"
      role="dialog"
      aria-modal="true"
      aria-label={!title && ariaLabel ? ariaLabel : undefined}
      aria-labelledby={title ? 'c-modal-title' : undefined}
      onClick={() => {
        if (!disableBackdropClose) onClose();
      }}
    >
      <div className="c-modal__panel" onClick={(event) => event.stopPropagation()}>
        {!hideHeader ? (
          <header className="c-modal__header">
            {title ? (
              <h2 id="c-modal-title" className="c-modal__title">
                {title}
              </h2>
            ) : (
              <span aria-hidden="true" />
            )}
            {hideCloseButton ? (
              <span className="c-modal__close-spacer" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className="c-modal__close"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <TbX aria-hidden="true" />
              </button>
            )}
          </header>
        ) : null}
        <div className="c-modal__body">{children}</div>
      </div>
    </div>,
    portalTarget,
  );
}
