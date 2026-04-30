import { randomBytes } from 'node:crypto';

import { Types } from 'mongoose';

import {
  BLISTER_RESTORE_WINDOW_MS,
  BLISTER_ROLES,
  DEFAULT_PERSONAL_BLISTER_NAME,
  MAX_BLISTERS_PER_USER,
} from '../../constants/domain.constants';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';
import { AppError } from '../../utils/app-error';
import {
  type CreateBlisterInput,
  type CreateInviteInput,
  type JoinBlisterInput,
  type UpdateMemberRoleInput,
  type UpdateBlisterInput,
} from '../../../../shared/schemas/index';

interface BlisterMemberView {
  userId: string;
  role: (typeof BLISTER_ROLES)[number];
  fullName?: string;
  username?: string;
  avatarKey?: string | null;
}

interface BlisterMemberDetailView extends BlisterMemberView {
  fullName: string;
  username: string;
  avatarKey: string | null;
}

interface BlisterView {
  _id: string;
  name: string;
  avatarKey: string | null;
  deletedAt: Date | null | undefined;
  members: BlisterMemberView[];
  treatmentsCount?: number;
  medicinesCount?: number;
  inviteCode?: {
    code: string;
    exp: Date;
    role: (typeof BLISTER_ROLES)[number];
  } | null;
}

const INVITE_EXPIRATION_MS = 48 * 60 * 60 * 1000;

interface MemberUserView {
  name: string;
  username: string;
  settings?: {
    avatarKey?: string;
  };
}

const toBlisterView = (
  blister: Awaited<ReturnType<typeof BlisterModel.findOne>>,
  userById?: Map<string, MemberUserView>,
): BlisterView => ({
  _id: blister!._id.toString(),
  name: blister!.name,
  avatarKey: blister!.avatarKey ?? null,
  deletedAt: blister!.deletedAt,
  members: blister!.members.map((member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) => {
    const memberUserId = member.userId.toString();
    const user = userById?.get(memberUserId);
    return {
      userId: memberUserId,
      role: member.role,
      ...(user
        ? {
            fullName: user.name,
            username: user.username,
            avatarKey: user.settings?.avatarKey ?? null,
          }
        : {}),
    };
  }),
  inviteCode: blister!.inviteCode
    ? {
        code: blister!.inviteCode.code,
        exp: blister!.inviteCode.exp,
        role: blister!.inviteCode.role,
      }
    : null,
});

const createInviteCode = (): string => randomBytes(4).toString('hex').slice(0, 8).toUpperCase();

const ensureUserExists = async (userId: string): Promise<void> => {
  const user = await UserModel.findById(userId).lean();

  if (!user) {
    throw new AppError({
      code: 'BLISTER_USER_NOT_FOUND',
      message: 'User not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }
};

const findActiveBlisterById = async (blisterId: string) => {
  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    deletedAt: null,
  });

  if (!blister) {
    throw new AppError({
      code: 'BLISTER_NOT_FOUND',
      message: 'Blister not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return blister;
};

const findMembership = (blister: Awaited<ReturnType<typeof findActiveBlisterById>>, userId: string) =>
  blister.members.find(
    (member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) =>
      member.userId.toString() === userId,
  );

const ensureMemberAccess = async (blisterId: string, userId: string) => {
  const blister = await findActiveBlisterById(blisterId);
  const membership = findMembership(blister, userId);

  if (!membership) {
    throw new AppError({
      code: 'BLISTER_ACCESS_FORBIDDEN',
      message: 'You do not have access to this blister.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  return { blister, membership };
};

const ensureOwnerAccess = async (blisterId: string, userId: string) => {
  const { blister, membership } = await ensureMemberAccess(blisterId, userId);

  if (membership.role !== 'OWNER') {
    throw new AppError({
      code: 'BLISTER_OWNER_REQUIRED',
      message: 'Owner role is required for this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  return blister;
};

const countActiveBlistersForUser = async (userId: string, excludingBlisterId?: string): Promise<number> =>
  BlisterModel.countDocuments({
    deletedAt: null,
    members: {
      $elemMatch: {
        userId: new Types.ObjectId(userId),
      },
    },
    ...(excludingBlisterId ? { _id: { $ne: new Types.ObjectId(excludingBlisterId) } } : {}),
  });

/**
 * Throws if the user already belongs to MAX_BLISTERS_PER_USER active blisters.
 * Use this guard before creating a new blister or joining via invite.
 */
const ensureUserBelowBlisterCap = async (userId: string): Promise<void> => {
  const active = await countActiveBlistersForUser(userId);
  if (active >= MAX_BLISTERS_PER_USER) {
    throw new AppError({
      code: 'BLISTER_LIMIT_REACHED',
      message: `A user cannot belong to more than ${MAX_BLISTERS_PER_USER} active blisters.`,
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }
};

const createSafetyBlisterIfNeeded = async (userId: string, excludingBlisterId: string): Promise<void> => {
  const activeBlisters = await countActiveBlistersForUser(userId, excludingBlisterId);

  if (activeBlisters > 0) {
    return;
  }

  await BlisterModel.create({
    name: DEFAULT_PERSONAL_BLISTER_NAME,
    members: [
      {
        userId: new Types.ObjectId(userId),
        role: 'OWNER',
      },
    ],
  });
};

const ensureOwnerProtection = (
  blister: Awaited<ReturnType<typeof findActiveBlisterById>>,
  targetUserId: string,
): void => {
  const targetMember = findMembership(blister, targetUserId);

  if (!targetMember || targetMember.role !== 'OWNER') {
    return;
  }

  const remainingOwners = blister.members.filter(
    (member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) =>
      member.role === 'OWNER' && member.userId.toString() !== targetUserId,
  );

  if (remainingOwners.length === 0) {
    throw new AppError({
      code: 'BLISTER_OWNER_PROTECTION',
      message: 'The blister must keep at least one owner.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }
};

/**
 * Lists all active blisters available to the authenticated user, including
 * counts of active treatments and medicines for the dashboard list view.
 */
export const blistersList = async (userId: string): Promise<BlisterView[]> => {
  const blisters = await BlisterModel.find({
    deletedAt: null,
    members: {
      $elemMatch: {
        userId: new Types.ObjectId(userId),
      },
    },
  });

  const memberIds = [
    ...new Set(
      blisters.flatMap((blister) =>
        blister.members.map((member: { userId: Types.ObjectId }) => member.userId.toString()),
      ),
    ),
  ];
  const users = await UserModel.find({ _id: { $in: memberIds.map((id) => new Types.ObjectId(id)) } })
    .select('name username settings.avatarKey')
    .lean();
  const userById = new Map(
    users.map((user) => [
      user._id.toString(),
      {
        name: user.name,
        username: user.username,
        settings: user.settings,
      },
    ] as const),
  );

  return Promise.all(
    blisters.map(async (blister) => {
      const blisterId = blister._id;
      const [treatmentsCount, medicinesCount] = await Promise.all([
        TreatmentModel.countDocuments({ blisterId, active: true }),
        MedicineModel.countDocuments({ blisterId }),
      ]);
      return {
        ...toBlisterView(blister, userById),
        treatmentsCount,
        medicinesCount,
      };
    }),
  );
};

/**
 * Creates a new blister with the authenticated user as owner.
 */
export const blistersCreate = async (userId: string, input: CreateBlisterInput): Promise<BlisterView> => {
  await ensureUserExists(userId);
  await ensureUserBelowBlisterCap(userId);

  const blister = await BlisterModel.create({
    name: input.name,
    avatarKey: input.avatarKey ?? null,
    members: [
      {
        userId: new Types.ObjectId(userId),
        role: 'OWNER',
      },
    ],
  });

  return toBlisterView(blister);
};

/**
 * Updates mutable blister fields (name, avatarKey) for an owner.
 */
export const blistersUpdate = async (
  blisterId: string,
  userId: string,
  input: UpdateBlisterInput,
): Promise<BlisterView> => {
  const blister = await ensureOwnerAccess(blisterId, userId);

  if (input.name !== undefined) {
    blister.name = input.name;
  }
  if (input.avatarKey !== undefined) {
    blister.avatarKey = input.avatarKey;
  }
  await blister.save();

  return toBlisterView(blister);
};

/**
 * Soft deletes a blister for owners.
 */
export const blistersDelete = async (blisterId: string, userId: string): Promise<void> => {
  const blister = await ensureOwnerAccess(blisterId, userId);

  blister.deletedAt = new Date();
  await blister.save();
};

/**
 * Restores a soft-deleted blister within the BLISTER_RESTORE_WINDOW_MS grace period.
 * Only the original owner can restore. Re-applies the per-user blister cap.
 */
export const blistersRestore = async (blisterId: string, userId: string): Promise<BlisterView> => {
  const blister = await BlisterModel.findById(new Types.ObjectId(blisterId));

  if (!blister) {
    throw new AppError({
      code: 'BLISTER_NOT_FOUND',
      message: 'Blister not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  if (!blister.deletedAt) {
    throw new AppError({
      code: 'BLISTER_NOT_DELETED',
      message: 'Blister is not in a deleted state.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  if (Date.now() - blister.deletedAt.getTime() > BLISTER_RESTORE_WINDOW_MS) {
    throw new AppError({
      code: 'BLISTER_RESTORE_WINDOW_EXPIRED',
      message: 'The grace period to restore this blister has expired.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }

  const membership = findMembership(blister, userId);
  if (!membership || membership.role !== 'OWNER') {
    throw new AppError({
      code: 'BLISTER_OWNER_REQUIRED',
      message: 'Owner role is required for this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  await ensureUserBelowBlisterCap(userId);

  blister.deletedAt = null;
  await blister.save();

  return toBlisterView(blister);
};

/**
 * Creates or replaces a temporary invite code for the blister.
 */
export const blistersCreateInvite = async (
  blisterId: string,
  userId: string,
  input: CreateInviteInput,
): Promise<NonNullable<BlisterView['inviteCode']>> => {
  const blister = await ensureOwnerAccess(blisterId, userId);

  blister.inviteCode = {
    code: createInviteCode(),
    exp: new Date(Date.now() + INVITE_EXPIRATION_MS),
    role: input.role,
  };
  await blister.save();

  return {
    code: blister.inviteCode.code,
    exp: blister.inviteCode.exp,
    role: blister.inviteCode.role,
  };
};

/**
 * Joins an authenticated user to a blister using a valid invite code.
 */
export const blistersJoin = async (userId: string, input: JoinBlisterInput): Promise<BlisterView> => {
  const blister = await BlisterModel.findOne({
    'inviteCode.code': input.code,
    deletedAt: null,
  });

  if (!blister?.inviteCode || blister.inviteCode.exp.getTime() <= Date.now()) {
    throw new AppError({
      code: 'BLISTER_INVITE_INVALID',
      message: 'Invite code is invalid or expired.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  const existingMembership = findMembership(blister, userId);

  if (existingMembership) {
    throw new AppError({
      code: 'BLISTER_ALREADY_MEMBER',
      message: 'User already belongs to this blister.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }

  await ensureUserBelowBlisterCap(userId);

  blister.members.push({
    userId: new Types.ObjectId(userId),
    role: blister.inviteCode.role,
  });
  blister.inviteCode = null;
  await blister.save();

  return toBlisterView(blister);
};

/**
 * Lists blister members for any authenticated member of that blister, joining
 * the user collection so the frontend can render names and avatars.
 */
export const blistersListMembers = async (
  blisterId: string,
  userId: string,
): Promise<BlisterMemberDetailView[]> => {
  const { blister } = await ensureMemberAccess(blisterId, userId);

  const memberIds = blister.members.map(
    (member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) => member.userId,
  );
  const users = await UserModel.find({ _id: { $in: memberIds } })
    .select('name username settings.avatarKey')
    .lean();
  const userById = new Map(
    users.map((user) => [user._id.toString(), user] as const),
  );

  return blister.members.map(
    (member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) => {
      const id = member.userId.toString();
      const user = userById.get(id);
      return {
        userId: id,
        role: member.role,
        fullName: user?.name ?? '',
        username: user?.username ?? '',
        avatarKey: (user?.settings?.avatarKey as string | undefined) ?? null,
      };
    },
  );
};

/**
 * Removes a member from a blister or allows self-leave with safety validations.
 */
export const blistersRemoveMember = async (
  blisterId: string,
  requesterUserId: string,
  targetUserId: string,
): Promise<void> => {
  const { blister, membership } = await ensureMemberAccess(blisterId, requesterUserId);
  const targetMember = findMembership(blister, targetUserId);

  if (!targetMember) {
    throw new AppError({
      code: 'BLISTER_MEMBER_NOT_FOUND',
      message: 'Member not found in blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  const isSelfLeave = requesterUserId === targetUserId;

  if (!isSelfLeave && membership.role !== 'OWNER') {
    throw new AppError({
      code: 'BLISTER_OWNER_REQUIRED',
      message: 'Owner role is required for this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  ensureOwnerProtection(blister, targetUserId);
  await createSafetyBlisterIfNeeded(targetUserId, blisterId);

  blister.members = blister.members.filter(
    (member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) =>
      member.userId.toString() !== targetUserId,
  );
  await blister.save();
};

/**
 * Updates a blister member role for owners with owner-safety validation.
 */
export const blistersUpdateMemberRole = async (
  blisterId: string,
  requesterUserId: string,
  targetUserId: string,
  input: UpdateMemberRoleInput,
): Promise<BlisterMemberView[]> => {
  const blister = await ensureOwnerAccess(blisterId, requesterUserId);
  const targetMember = findMembership(blister, targetUserId);

  if (!targetMember) {
    throw new AppError({
      code: 'BLISTER_MEMBER_NOT_FOUND',
      message: 'Member not found in blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  if (targetMember.role === input.role) {
    return blister.members.map((member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) => ({
      userId: member.userId.toString(),
      role: member.role,
    }));
  }

  if (targetMember.role === 'OWNER' && input.role !== 'OWNER') {
    ensureOwnerProtection(blister, targetUserId);
  }

  targetMember.role = input.role;
  await blister.save();

  return blister.members.map((member: { userId: Types.ObjectId; role: (typeof BLISTER_ROLES)[number] }) => ({
    userId: member.userId.toString(),
    role: member.role,
  }));
};
