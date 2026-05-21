import { useId, useState, type ReactNode } from 'react';
import { TbInfoCircle } from 'react-icons/tb';

interface InfoTooltipProps {
  /** Texto descriptivo que se muestra dentro del tooltip. */
  content: ReactNode;
  /** Etiqueta accesible del botón (lector de pantalla). */
  label?: string;
  /** Clase opcional para alinear con el label del campo. */
  className?: string;
}

/**
 * Pequeño icono de "más información" con tooltip suave.
 *
 * Se muestra al hacer hover sobre el icono o al ganar foco con teclado.
 * El contenido del tooltip está vinculado vía `aria-describedby` para
 * lectores de pantalla y solo se muestra cuando el usuario lo solicita.
 */
export function InfoTooltip({ content, label = 'Más información', className }: InfoTooltipProps) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={['c-info-tooltip', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="c-info-tooltip__trigger"
        aria-label={label}
        aria-describedby={isVisible ? id : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        <TbInfoCircle className="c-icon c-icon--sm" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={[
          'c-info-tooltip__bubble',
          isVisible && 'c-info-tooltip__bubble--visible',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </span>
    </span>
  );
}
