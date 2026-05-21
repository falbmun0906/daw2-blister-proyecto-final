import type { ButtonHTMLAttributes } from 'react';
import { TbDotsVertical } from 'react-icons/tb';

interface ActionMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/** Boton iconico reutilizable para abrir menus contextuales de acciones. */
export function ActionMenuButton({
  className,
  label,
  type = 'button',
  ...props
}: ActionMenuButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={['c-action-menu__toggle', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <TbDotsVertical aria-hidden="true" />
    </button>
  );
}
