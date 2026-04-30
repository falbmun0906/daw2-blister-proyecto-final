import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { RoleBadge } from '../../components/molecules/RoleBadge';
import { ROUTES } from '../../constants/routes';
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import type { Blister, BlisterRole } from '../../types/blister.types';

function resolveRole(blister: Blister, userId: string | null): BlisterRole | null {
  if (!userId) return null;
  return blister.members.find((m) => m.userId === userId)?.role ?? null;
}

function ListSkeleton() {
  return (
    <div className="c-home__skeleton" aria-busy="true">
      <Skeleton variant="rect" height="6rem" />
      <Skeleton variant="rect" height="6rem" />
      <Skeleton variant="rect" height="6rem" />
    </div>
  );
}

/** Lista de blísters del usuario, con acceso a CRUD y selección de activo. */
export default function BlisterListPage() {
  usePageTitle('Mis blísteres');
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { isLoading, error, refresh } = useBlisters();
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);

  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;

  if (blisters.length === 0) {
    return (
      <EmptyState
        title="Todavía no tienes blísters"
        description="Crea uno nuevo o únete a uno existente con su código de invitación."
        ctaLabel="Crear blíster"
        onCtaClick={() => navigate(ROUTES.createBlister)}
      >
        <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.joinBlister)}>
          Unirme con un código
        </Button>
      </EmptyState>
    );
  }

  return (
    <section aria-labelledby="blisters-title">
      <header className="c-home" style={{ marginBottom: 'var(--space-4)' }}>
        <h2 className="c-home__greeting" id="blisters-title">
          Mis blísters
        </h2>
        <p className="c-home__subtitle">
          Selecciona un blíster para abrirlo en Inicio o gestiona sus miembros.
        </p>
      </header>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-stack)' }}>
        {blisters.map((blister) => {
          const role = resolveRole(blister, userId);
          const isActive = blister._id === activeBlisterId;
          return (
            <li key={blister._id} className={`c-blister-card ${isActive ? 'is-active' : ''}`}>
              <header className="c-blister-card__header">
                <h3 className="c-blister-card__title">{blister.name}</h3>
                {role ? <RoleBadge role={role} /> : null}
              </header>
              <p className="c-blister-card__meta">
                {blister.members.length} miembro{blister.members.length === 1 ? '' : 's'}
                {isActive ? ' · Seleccionado' : ''}
              </p>
              <div className="c-blister-card__actions">
                <Button
                  type="button"
                  variant={isActive ? 'ghost' : 'primary-outline'}
                  onClick={() => {
                    setActiveBlister(blister._id, role);
                    navigate(ROUTES.home);
                  }}
                  disabled={isActive}
                >
                  {isActive ? 'Seleccionado' : 'Abrir en Inicio'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(ROUTES.blisterMembers(blister._id))}
                >
                  Miembros
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-section)' }}>
        <Button type="button" variant="primary" fullWidth onClick={() => navigate(ROUTES.createBlister)}>
          Crear nuevo blíster
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={() => navigate(ROUTES.joinBlister)}>
          Unirme con un código
        </Button>
      </div>
    </section>
  );
}
