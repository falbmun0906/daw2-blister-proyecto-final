import type { ComponentType, SVGProps } from 'react';
import { TbPill, TbDroplet, TbFirstAidKit, TbCapsule } from 'react-icons/tb';
import { PiSyringe, PiWind } from 'react-icons/pi';

import type { IconType } from '../../types/medicine.types';

interface MedicineIconProps {
  type: IconType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_MAP: Record<IconType, IconComponent> = {
  pill: TbPill,
  capsule: TbCapsule,
  liquid: TbDroplet,
  cream: TbFirstAidKit,
  inhaler: PiWind,
  syringe: PiSyringe,
  generic: TbFirstAidKit,
};

const SIZE_CLASS: Record<NonNullable<MedicineIconProps['size']>, string> = {
  sm: 'c-icon--md',
  md: 'c-icon--lg',
  lg: 'c-icon--xl',
};

export function MedicineIcon({
  type,
  size = 'md',
  className,
  ariaLabel,
}: MedicineIconProps) {
  const Icon = ICON_MAP[type];
  const isLabelled = Boolean(ariaLabel);
  const classes = [
    'c-icon',
    SIZE_CLASS[size],
    'c-medicine-icon',
    `c-medicine-icon--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Icon
      className={classes}
      role={isLabelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isLabelled ? undefined : true}
    />
  );
}
