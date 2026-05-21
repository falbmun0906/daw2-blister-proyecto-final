import type { BlisterRole } from '../../types/blister.types';

const ROLE_LABEL: Record<BlisterRole, string> = {
  OWNER: 'Propietario',
  CAREGIVER: 'Cuidador',
  OBSERVER: 'Observador',
};

const ROLE_MODIFIER: Record<BlisterRole, string> = {
  OWNER: 'c-role-badge--owner',
  CAREGIVER: 'c-role-badge--caregiver',
  OBSERVER: 'c-role-badge--observer',
};

interface RoleBadgeProps {
  role: BlisterRole;
  className?: string;
}

/**
 * Etiqueta visual del rol del usuario en un blíster.
 * No es interactiva: solo informa. Para acciones de cambio de rol
 * usar `BlisterMembersPage`.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span className={['c-role-badge', ROLE_MODIFIER[role], className].filter(Boolean).join(' ')}>
      {ROLE_LABEL[role]}
    </span>
  );
}
