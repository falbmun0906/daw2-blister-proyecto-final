import { model, models, Schema } from 'mongoose';

import { BLISTER_ROLES } from '../constants/domain.constants';
import { type BlisterDocument } from '../types/blister.types';

const blisterMemberSchema = new Schema<BlisterDocument['members'][number]>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: BLISTER_ROLES,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const inviteCodeSchema = new Schema<NonNullable<BlisterDocument['inviteCode']>>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 8,
      uppercase: true,
    },
    exp: {
      type: Date,
      required: true,
    },
    role: {
      type: String,
      enum: BLISTER_ROLES,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const blisterSchema = new Schema<BlisterDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120,
  },
  avatarKey: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 100,
    default: null,
  },
  members: {
    type: [blisterMemberSchema],
    required: true,
    validate: {
      validator: (members: BlisterDocument['members']) => members.length > 0,
      message: 'A blister must have at least one member.',
    },
  },
  inviteCode: {
    type: inviteCodeSchema,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

blisterSchema.index(
  { 'inviteCode.code': 1 },
  {
    unique: true,
    sparse: true,
  },
);

export const BlisterModel = models.Blister ?? model<BlisterDocument>('Blister', blisterSchema);
