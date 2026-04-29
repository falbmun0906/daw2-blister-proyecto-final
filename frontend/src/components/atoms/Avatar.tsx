import { getAvatarBackground, getInitials } from '../../constants/avatars';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  avatarKey?: string;
  size?: AvatarSize;
  ariaLabel?: string;
}

/**
 * Avatar circular que renderiza un fondo de color asociado al `avatarKey`
 * con las iniciales del usuario por encima. Cuando no hay clave válida,
 * cae al estilo por defecto basado en el tono primario.
 */
export function Avatar({ name, avatarKey, size = 'md', ariaLabel }: AvatarProps) {
  const initials = getInitials(name);
  const background = getAvatarBackground(avatarKey);
  const className = ['c-avatar', `c-avatar--${size}`].join(' ');
  const label = ariaLabel ?? `Avatar de ${name}`;

  return (
    <span
      className={className}
      role="img"
      aria-label={label}
      style={{ backgroundColor: background }}
    >
      <span className="c-avatar__initials" aria-hidden="true">
        {initials}
      </span>
    </span>
  );
}
