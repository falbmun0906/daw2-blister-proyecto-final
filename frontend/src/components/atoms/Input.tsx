import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, wrapperClassName, 'aria-describedby': ariaDescribedBy, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <label className={['c-field', wrapperClassName].filter(Boolean).join(' ')} htmlFor={inputId}>
      <span className="c-field__label">{label}</span>
      <input
        {...props}
        ref={ref}
        id={inputId}
        className={className}
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