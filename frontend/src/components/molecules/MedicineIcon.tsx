import type { IconType } from '../../types/medicine.types';

interface MedicineIconProps {
  type: IconType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

const PATHS: Record<IconType, string> = {
  pill:
    'M5 12c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7-7-3.1-7-7zm2 0h10',
  capsule:
    'M7.5 4.5l12 12a4 4 0 0 1-5.66 5.66l-12-12a4 4 0 0 1 5.66-5.66z',
  liquid:
    'M12 3l5 8.5a5 5 0 1 1-10 0L12 3z',
  cream:
    'M6 8h12v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8zm3-3h6v3H9V5z',
  inhaler:
    'M4 10h10v6H4zM14 11h4l2 2v2l-2 2h-4',
  syringe:
    'M14 3l7 7-2 2-2-2-9 9H4v-4l9-9-2-2 2-2z',
  generic:
    'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 4v6m0 0v.01',
};

const SIZE_PX: Record<NonNullable<MedicineIconProps['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 48,
};

export function MedicineIcon({
  type,
  size = 'md',
  className,
  ariaLabel,
}: MedicineIconProps) {
  const px = SIZE_PX[size];
  const isLabelled = Boolean(ariaLabel);

  return (
    <svg
      className={['c-medicine-icon', `c-medicine-icon--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 24 24"
      width={px}
      height={px}
      role={isLabelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={isLabelled ? undefined : true}
    >
      <path
        d={PATHS[type]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
