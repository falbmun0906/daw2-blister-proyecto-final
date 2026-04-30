import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { TbMinus, TbPlus } from 'react-icons/tb';

interface StepperProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  /** Valor numérico actual (controlado). */
  value: number;
  /** Notifica el nuevo valor (siempre acotado entre `min` y `max`). */
  onChange: (next: number) => void;
  /** Incremento por click en los botones ± (por defecto 1). */
  step?: number;
  min?: number;
  max?: number;
  /** Texto opcional mostrado a la derecha (ej. "pastillas"). */
  unit?: string;
  error?: string;
}

/**
 * Selector numérico con botones ±. Útil para "cantidad disponible" o
 * "umbral de aviso" en formularios. Mantiene `value` siempre dentro de
 * `[min, max]` y permite también edición manual del input subyacente.
 */
export const Stepper = forwardRef<HTMLInputElement, StepperProps>(function Stepper(
  { label, value, onChange, step = 1, min = 0, max = 9999, unit, error, id, name, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const clamp = (n: number): number => Math.min(max, Math.max(min, n));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

  return (
    <div className={['c-stepper', error && 'c-stepper--error'].filter(Boolean).join(' ')}>
      {label ? (
        <label className="c-stepper__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="c-stepper__control">
        <button
          type="button"
          className="c-stepper__btn"
          onClick={dec}
          disabled={value <= min}
          aria-label="Disminuir"
        >
          <TbMinus aria-hidden="true" />
        </button>
        <input
          {...rest}
          ref={ref}
          id={inputId}
          name={name}
          type="number"
          inputMode="numeric"
          className="c-stepper__input"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            onChange(clamp(Number.isNaN(parsed) ? min : parsed));
          }}
          aria-invalid={error ? true : undefined}
          aria-errormessage={errorId}
        />
        {unit ? <span className="c-stepper__unit">{unit}</span> : null}
        <button
          type="button"
          className="c-stepper__btn"
          onClick={inc}
          disabled={value >= max}
          aria-label="Aumentar"
        >
          <TbPlus aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <span className="c-stepper__error" id={errorId} role="status" aria-live="polite">
          {error}
        </span>
      ) : null}
    </div>
  );
});
