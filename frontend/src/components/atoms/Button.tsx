import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'primary-outline' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  fullWidth,
  loading = false,
  type = 'button',
  variant = 'primary',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      className={[
        'c-btn',
        `c-btn--${variant}`,
        fullWidth && 'c-btn--full',
        loading && 'c-btn--loading',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="c-btn__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}