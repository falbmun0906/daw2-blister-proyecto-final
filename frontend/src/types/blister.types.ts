import { blisterRoles } from '../../../shared/schemas/schema.constants';

export type BlisterRole = (typeof blisterRoles)[number];

export interface BlisterMember {
  userId: string;
  role: BlisterRole;
}

export interface InviteCode {
  code: string;
  exp: string;
  role: BlisterRole;
}

export interface Blister {
  _id: string;
  name: string;
  avatarKey?: string | null;
  members: BlisterMember[];
  inviteCode?: InviteCode | null;
  deletedAt?: string | null;
  /** Treatments con `active: true` para este blíster. */
  treatmentsCount?: number;
  /** Medicamentos registrados en el blíster. */
  medicinesCount?: number;
}

/**
 * Detalle de un miembro tal y como lo devuelve `GET /blisters/:id/members`.
 * Incluye datos del usuario suficientes para pintar la lista (nombre + avatar).
 */
export interface BlisterMemberDetail {
  userId: string;
  role: BlisterRole;
  fullName: string;
  username: string;
  avatarKey?: string | null;
}