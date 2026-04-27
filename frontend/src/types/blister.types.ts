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
  members: BlisterMember[];
  inviteCode?: InviteCode | null;
  deletedAt?: string | null;
}