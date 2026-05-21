import type { CSSProperties, HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
}

export function Skeleton({ variant = 'text', width, height, className, style, ...props }: SkeletonProps) {
  const mergedStyle: CSSProperties = {
    ...style,
    width,
    height,
  };

  return (
    <span
      aria-hidden="true"
      className={['c-skeleton', `c-skeleton--${variant}`, className].filter(Boolean).join(' ')}
      style={mergedStyle}
      {...props}
    />
  );
}