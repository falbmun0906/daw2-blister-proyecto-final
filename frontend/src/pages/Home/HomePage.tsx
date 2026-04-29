import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { useBlisters } from '../../hooks/use.blisters';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';

function HomeSkeleton() {
  return (
    <div className="c-home__skeleton" aria-busy="true">
      <Skeleton variant="rect" height="3rem" />
      <Skeleton variant="rect" height="6rem" />
      <Skeleton variant="rect" height="6rem" />
      <Skeleton variant="rect" height="6rem" />
    </div>
  );
}

/** Pantalla raíz autenticada. Muestra alertas y próximas dosis del blíster activo. */
export default function HomePage() {
  const navigate = useNavigate();
  const { isLoading, error, refresh } = useBlisters();
  const user = useAuthStore((s) => s.user);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const blisters = useBlisterStore((s) => s.blisters);

  if (isLoading) return <HomeSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;

  if (!activeBlisterId || blisters.length === 0) {
    return (
      <EmptyState
        title="Aún no tienes blísters"
        description="Crea tu primer blíster para empezar a gestionar tu medicación o únete con un código."
        ctaLabel="Crear blíster"
        onCtaClick={() => navigate(ROUTES.createBlister)}
      >
        <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.joinBlister)}>
          Tengo un código
        </Button>
      </EmptyState>
    );
  }

  return (
    <section className="c-home" aria-labelledby="home-greeting">
      <header>
        <h2 className="c-home__greeting" id="home-greeting">
          Hola, {user?.name?.split(' ')[0] ?? ''}
        </h2>
        <p className="c-home__subtitle">Resumen de tu blíster activo.</p>
      </header>

      <section aria-labelledby="home-doses">
        <h3 className="c-home__section-title" id="home-doses">
          Próximas dosis
        </h3>
        <p className="c-home__subtitle">
          Aún estamos preparando esta vista. Mientras tanto puedes revisar tus tratamientos.
        </p>
      </section>
    </section>
  );
}
