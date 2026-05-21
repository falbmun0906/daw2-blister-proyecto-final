import { useId, type ReactNode } from 'react';

import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  children?: ReactNode;
}

export function EmptyState({ title, description, ctaLabel, onCtaClick, children }: EmptyStateProps) {
  const titleId = useId();

  return (
    <section className="c-empty-state" aria-labelledby={titleId}>
      <h2 className="c-empty-state__title" id={titleId}>
        {title}
      </h2>
      <p className="c-empty-state__description">{description}</p>
      {children}
      {ctaLabel && onCtaClick ? (
        <Button type="button" variant="primary" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      ) : null}
    </section>
  );
}