import { model, models, Schema } from 'mongoose';

import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
} from '../constants/domain.constants';
import { type UserDocument } from '../types/user.types';

const userSettingsSchema = new Schema<UserDocument['settings']>(
  {
    theme: {
      type: String,
      enum: THEME_OPTIONS,
      default: 'system',
      required: true,
      trim: true,
    },
    font: {
      type: String,
      enum: FONT_OPTIONS,
      default: 'standard',
      required: true,
      trim: true,
    },
    fontSize: {
      type: String,
      enum: FONT_SIZE_OPTIONS,
      default: 'normal',
      required: true,
      trim: true,
    },
    avatarKey: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 100,
      default: undefined,
    },
    notifications: {
      pushEnabled: { type: Boolean, required: true, default: false },
      stock: { type: Boolean, required: true, default: true },
      expiration: { type: Boolean, required: true, default: true },
      cima: { type: Boolean, required: true, default: true },
      adherence: { type: Boolean, required: true, default: true },
      doses: { type: Boolean, required: true, default: true },
      appointments: { type: Boolean, required: true, default: true },
      appointmentReminderPreset: {
        type: String,
        enum: ['3h', '12h', '1d', 'custom'],
        required: true,
        default: '3h',
      },
      customAppointmentReminderHours: { type: Number, required: true, min: 1, max: 168, default: 3 },
    },
  },
  {
    _id: false,
  },
);

const userSchema = new Schema<UserDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 150,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  pendingEmail: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 150,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    default: null,
  },
  password: {
    type: String,
    required: true,
    minlength: 60,
    maxlength: 255,
    select: false,
  },
  mcpToken: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    select: false,
  },
  mcpTokenCreatedAt: {
    type: Date,
    default: null,
    select: false,
  },
  mcpTokenExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  mcpTokenLastUsedAt: {
    type: Date,
    default: null,
    select: false,
  },
  refreshTokenHash: {
    type: String,
    trim: true,
    select: false,
    default: null,
  },
  refreshTokenExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  settings: {
    type: userSettingsSchema,
    default: () => ({}),
    required: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

export const UserModel = models.User ?? model<UserDocument>('User', userSchema);
