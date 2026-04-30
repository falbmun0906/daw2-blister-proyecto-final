import avatar1 from '../assets/images/avatars/avatar-1.png';
import avatar2 from '../assets/images/avatars/avatar-2.png';
import avatar3 from '../assets/images/avatars/avatar-3.png';
import avatar4 from '../assets/images/avatars/avatar-4.png';
import avatar5 from '../assets/images/avatars/avatar-5.png';
import avatar6 from '../assets/images/avatars/avatar-6.png';
import avatar7 from '../assets/images/avatars/avatar-7.png';
import avatar8 from '../assets/images/avatars/avatar-8.png';
import avatar9 from '../assets/images/avatars/avatar-9.png';
import avatar10 from '../assets/images/avatars/avatar-10.png';
import avatar11 from '../assets/images/avatars/avatar-11.png';

/**
 * Conjunto fijo de avatares predefinidos. La clave se almacena como string
 * en `user.settings.avatarKey` y se resuelve a iniciales si no existe.
 */
export const AVATAR_OPTIONS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
  'avatar-7',
  'avatar-8',
  'avatar-9',
  'avatar-10',
  'avatar-11',
] as const;

export type AvatarOptionKey = (typeof AVATAR_OPTIONS)[number];

const AVATAR_IMAGES: Record<AvatarOptionKey, string> = {
  'avatar-1': avatar1,
  'avatar-2': avatar2,
  'avatar-3': avatar3,
  'avatar-4': avatar4,
  'avatar-5': avatar5,
  'avatar-6': avatar6,
  'avatar-7': avatar7,
  'avatar-8': avatar8,
  'avatar-9': avatar9,
  'avatar-10': avatar10,
  'avatar-11': avatar11,
};

/** Devuelve el color de fondo asociado a un avatar predefinido. */
export function getAvatarBackground(key: string | undefined): string {
  if (!key) return 'var(--color-primary-subtle)';
  return 'var(--color-primary-subtle)';
}

/** Devuelve la imagen asociada a un avatar predefinido. */
export function getAvatarImage(key: string | undefined): string | null {
  if (!key || !(AVATAR_OPTIONS as readonly string[]).includes(key)) return null;
  return AVATAR_IMAGES[key as AvatarOptionKey];
}

export function getAvatarLabel(key: AvatarOptionKey): string {
  return `Avatar ${key.replace('avatar-', '')}`;
}

/** Calcula iniciales (1-2) a partir del nombre. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
