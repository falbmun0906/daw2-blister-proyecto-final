import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbAlertTriangle, TbCheck } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
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

// Demo statico: las próximas dosis se conectarán al backend cuando el módulo
// de adherencia exponga `/blisters/:id/upcoming-doses`. Por ahora reflejamos
// la maqueta con datos representativos para validar la UI.
interface DemoDose {
  id: string;
  time: string;
  status: 'taken' | 'next' | 'pending';
  medicine: string;
  detail: string;
  caregiver?: { name: string; avatarKey?: string };
}

const DEMO_DOSES: DemoDose[] = [
  {
    id: 'd1',
    time: '09:00',
    status: 'taken',
    medicine: 'Paracetamol 1g',
    detail: '1 pastilla · En ayuno',
    caregiver: { name: 'Ana' },
  },
  {
    id: 'd2',
    time: '12:00',
    status: 'next',
    medicine: 'Ibuprofeno 600mg',
    detail: '1 pastilla · Tomar con agua',
    caregiver: { name: 'Marta' },
  },
  {
    id: 'd3',
    time: '12:00',
    status: 'pending',
    medicine: 'Omeprazol 20mg',
    detail: '1 cápsula · Tras la comida',
    caregiver: { name: 'Marta' },
  },
];

function formatTodayLabel(): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

/** Pantalla raíz autenticada. Muestra alertas y próximas dosis del blíster activo. */
export default function HomePage() {
  const navigate = useNavigate();
  const { isLoading, error, refresh } = useBlisters();
  const user = useAuthStore((s) => s.user);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);

  const todayLabel = useMemo(formatTodayLabel, []);

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

  // Greeting reservado para una próxima iteración (saludo personalizado al usuario).
  void user;

  return (
    <section className="c-home" aria-label="Resumen del blíster activo">
      <CimaSearchDropdown
        blisterId={activeBlisterId}
        canMutate={activeRole === 'OWNER' || activeRole === 'CAREGIVER'}
      />

      <article className="c-home-alert" role="alert">
        <span className="c-home-alert__icon" aria-hidden="true">
          <TbAlertTriangle className="c-icon c-icon--md" aria-hidden="true" />
        </span>
        <div className="c-home-alert__body">
          <p className="c-home-alert__text">Quedan 2 pastillas de Paracetamol</p>
          <div className="c-home-alert__actions">
            <button type="button" className="c-home-alert__btn c-home-alert__btn--ghost">
              Descartar
            </button>
            <button type="button" className="c-home-alert__btn c-home-alert__btn--solid">
              Añadir más unidades
            </button>
          </div>
        </div>
      </article>

      <section className="c-home-next" aria-labelledby="home-next-title">
        <header className="c-home-next__header">
          <h2 id="home-next-title" className="c-home-next__title">Próximas dosis</h2>
          <p className="c-home-next__date">{todayLabel}</p>
        </header>

        <ol className="c-home-next__timeline">
          {DEMO_DOSES.map((dose) => (
            <li
              key={dose.id}
              className={`c-home-next__item c-home-next__item--${dose.status}`}
            >
              <span className="c-home-next__time">{dose.time}</span>

              <span className="c-home-next__marker" aria-hidden="true">
                {dose.status === 'taken' ? (
                  <TbCheck className="c-icon c-icon--sm" aria-hidden="true" />
                ) : (
                  <span className="c-home-next__marker-dot" />
                )}
              </span>

              <article className="c-home-next__card">
                <header className="c-home-next__card-header">
                  <span className="c-home-next__card-name">{dose.medicine}</span>
                  {dose.caregiver ? (
                    <Avatar name={dose.caregiver.name} avatarKey={dose.caregiver.avatarKey} size="sm" />
                  ) : null}
                </header>

                <p className="c-home-next__card-detail">{dose.detail}</p>

                {dose.status === 'taken' ? (
                  <span className="c-home-next__pill c-home-next__pill--taken">Tomado</span>
                ) : dose.status === 'next' ? (
                  <div className="c-home-next__card-actions">
                    <button type="button" className="c-home-next__btn c-home-next__btn--solid">
                      Marcar como tomado
                    </button>
                    <button type="button" className="c-home-next__btn c-home-next__btn--ghost">
                      Editar dosis
                    </button>
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
