import { useId, type ReactNode } from 'react';

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
        <button className="c-btn c-btn--primary" type="button" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      ) : null}
    </section>
  );
}