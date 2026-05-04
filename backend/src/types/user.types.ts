import { type Types } from 'mongoose';

import {
  type FONT_OPTIONS,
  type FONT_SIZE_OPTIONS,
  type THEME_OPTIONS,
} from '../constants/domain.constants';

export type ThemeOption = (typeof THEME_OPTIONS)[number];
export type FontOption = (typeof FONT_OPTIONS)[number];
export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number];

export interface UserSettings {
  theme: ThemeOption;
  font: FontOption;
  fontSize: FontSizeOption;
  avatarKey?: string;
  notifications: {
    pushEnabled: boolean;
    stock: boolean;
    expiration: boolean;
    cima: boolean;
    adherence: boolean;
    appointments: boolean;
    appointmentReminderPreset: '3h' | '12h' | '1d' | 'custom';
    customAppointmentReminderHours: number;
  };
}

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email: string;
  password: string;
  mcpToken?: string | null;
  refreshTokenHash?: string | null;
  refreshTokenExpiresAt?: Date | null;
  settings: UserSettings;
  deletedAt?: Date | null;
}
