import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, retryLabel = 'Reintentar', onRetry }: ErrorStateProps) {
  return (
    <section className="c-error-state" role="alert" aria-live="assertive">
      <h2 className="c-error-state__title">Algo no ha ido como esperaba</h2>
      <p className="c-error-state__message">{message}</p>
      {onRetry ? (
        <Button type="button" variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </section>
  );
}