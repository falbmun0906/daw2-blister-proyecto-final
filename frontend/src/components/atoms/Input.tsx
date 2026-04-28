import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, id, className, wrapperClassName, 'aria-describedby': ariaDescribedBy, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <label className={['c-field', wrapperClassName].filter(Boolean).join(' ')} htmlFor={inputId}>
      <span className="c-field__label">
        {icon ? <span className="c-field__label-icon">{icon}</span> : null}
        <span className="c-field__label-text">{label}</span>
      </span>
      <input
        {...props}
        ref={ref}
        id={inputId}
        className={['c-field__input', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-errormessage={errorId}
      />
      {hint ? (
        <span className="c-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="c-field__error" id={errorId} role="status" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
});