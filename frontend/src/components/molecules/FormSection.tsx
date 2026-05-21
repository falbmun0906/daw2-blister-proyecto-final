import type { ReactNode } from 'react';

interface FormSectionProps {
  /** Texto principal mostrado a la derecha del icono. */
  label: string;
  /** Icono opcional (ej. <TbTag />) que precede al label. */
  icon?: ReactNode;
  /** Texto auxiliar mostrado debajo del label. */
  hint?: string;
  /** Variante visual: `card` (con elevación) o `flat` (sin fondo). */
  variant?: 'card' | 'flat';
  className?: string;
  children: ReactNode;
}

/**
 * Sección de formulario con cabecera (icono + label + hint opcional) y un
 * área de contenido. Se utiliza para agrupar uno o varios `FormField`
 * relacionados manteniendo una jerarquía visual clara y consistente.
 */
export function FormSection({
  label,
  icon,
  hint,
  variant = 'card',
  className,
  children,
}: FormSectionProps) {
  const classes = [
    'c-form-section',
    variant === 'flat' ? 'c-form-section--flat' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <header className="c-form-section__header">
        {icon ? (
          <span className="c-form-section__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="c-form-section__heading">
          <h2 className="c-form-section__label">{label}</h2>
          {hint ? <p className="c-form-section__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="c-form-section__body">{children}</div>
    </section>
  );
}
