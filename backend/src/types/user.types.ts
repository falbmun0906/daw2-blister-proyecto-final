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
}

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email: string;
  password: string;
  mcpToken?: string | null;
  settings: UserSettings;
  deletedAt?: Date | null;
}
