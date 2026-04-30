import type { ComponentType, SVGProps } from 'react';
import {
  TbBriefcase,
  TbHome,
  TbUsers,
  TbHeart,
  TbPill,
  TbPlus,
  TbLeaf,
  TbSun,
} from 'react-icons/tb';

export const BLISTER_AVATAR_KEYS = [
  'briefcase',
  'home',
  'family',
  'heart',
  'pill',
  'cross',
  'leaf',
  'sun',
] as const;

export type BlisterAvatarKey = (typeof BLISTER_AVATAR_KEYS)[number];

const BLISTER_AVATAR_ICONS: Record<BlisterAvatarKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  briefcase: TbBriefcase,
  home: TbHome,
  family: TbUsers,
  heart: TbHeart,
  pill: TbPill,
  cross: TbPlus,
  leaf: TbLeaf,
  sun: TbSun,
};

const BLISTER_AVATAR_LABELS: Record<BlisterAvatarKey, string> = {
  briefcase: 'Maletín',
  home: 'Casa',
  family: 'Familia',
  heart: 'Corazón',
  pill: 'Pastilla',
  cross: 'Cruz médica',
  leaf: 'Hoja',
  sun: 'Sol',
};

/** Devuelve el icono asociado a una clave de avatar de blíster. */
export function getBlisterIcon(
  key: string | null | undefined,
): ComponentType<SVGProps<SVGSVGElement>> {
  if (key && (BLISTER_AVATAR_KEYS as readonly string[]).includes(key)) {
    return BLISTER_AVATAR_ICONS[key as BlisterAvatarKey];
  }
  return TbHome;
}

export function getBlisterAvatarLabel(key: BlisterAvatarKey): string {
  return BLISTER_AVATAR_LABELS[key];
}
