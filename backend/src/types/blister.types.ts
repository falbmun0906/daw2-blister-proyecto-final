import { type Types } from 'mongoose';

import { type BLISTER_ROLES } from '../constants/domain.constants';

export type BlisterRole = (typeof BLISTER_ROLES)[number];

export interface BlisterMember {
  userId: Types.ObjectId;
  role: BlisterRole;
}

export interface InviteCode {
  code: string;
  exp: Date;
  role: BlisterRole;
}

export interface BlisterDocument {
  _id: Types.ObjectId;
  name: string;
  members: BlisterMember[];
  inviteCode?: InviteCode | null;
  deletedAt?: Date | null;
}
