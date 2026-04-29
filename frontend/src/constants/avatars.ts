/**
 * Conjunto fijo de avatares predefinidos. La clave se almacena como string
 * en `user.settings.avatarKey` y se resuelve a iniciales si no existe.
 */
export const AVATAR_OPTIONS = [
  'avatar-minimal-01',
  'avatar-minimal-02',
  'avatar-minimal-03',
  'avatar-minimal-04',
  'avatar-minimal-05',
  'avatar-minimal-06',
  'avatar-minimal-07',
  'avatar-minimal-08',
] as const;

export type AvatarOptionKey = (typeof AVATAR_OPTIONS)[number];

const AVATAR_BACKGROUND_PALETTE: Record<AvatarOptionKey, string> = {
  'avatar-minimal-01': 'var(--color-primary-subtle)',
  'avatar-minimal-02': 'var(--color-primary-mid)',
  'avatar-minimal-03': 'var(--color-accent-subtle)',
  'avatar-minimal-04': 'var(--color-info-subtle)',
  'avatar-minimal-05': 'var(--color-success-subtle)',
  'avatar-minimal-06': 'var(--color-warning-subtle)',
  'avatar-minimal-07': 'var(--color-primary-tint)',
  'avatar-minimal-08': 'var(--color-surface-tinted)',
};

/** Devuelve el color de fondo asociado a un avatar predefinido. */
export function getAvatarBackground(key: string | undefined): string {
  if (!key) return 'var(--color-primary-subtle)';
  if ((AVATAR_OPTIONS as readonly string[]).includes(key)) {
    return AVATAR_BACKGROUND_PALETTE[key as AvatarOptionKey];
  }
  return 'var(--color-primary-subtle)';
}

/** Calcula iniciales (1-2) a partir del nombre. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
