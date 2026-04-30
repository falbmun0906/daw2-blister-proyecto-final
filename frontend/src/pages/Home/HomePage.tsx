import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbAlertTriangle, TbCheck } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { useTreatments } from '../../hooks/use.treatments';
import { ROUTES } from '../../constants/routes';
import { getUpcomingDoses, type UpcomingDose } from '../../services/me.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

interface HomeTimelineItem {
  key: string;
  status: 'taken' | 'next' | 'pending';
  date: Date;
  medicineName: string;
  detail: string;
  avatarName: string;
  dose?: UpcomingDose;
}

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

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
  const addToast = useUiStore((s) => s.addToast);
  const { medicines, refetch: refetchMedicines } = useMedicines(activeBlisterId);
  const { logs, logDose } = useAdherence(activeBlisterId);
  const { treatments } = useTreatments(activeBlisterId);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [dismissedLowStockAlertKey, setDismissedLowStockAlertKey] = useState<string | null>(null);

  const todayLabel = useMemo(() => formatTodayLabel(), []);
  const lowStockMedicine = useMemo(
    () => medicines.find((medicine) => medicine.stock <= medicine.threshold) ?? null,
    [medicines],
  );
  const lowStockAlertKey = lowStockMedicine
    ? `${lowStockMedicine._id}-${lowStockMedicine.stock}-${lowStockMedicine.threshold}`
    : null;
  const showLowStockAlert = Boolean(lowStockMedicine && lowStockAlertKey !== dismissedLowStockAlertKey);

  const latestLog = useMemo(() => logs[0] ?? null, [logs]);
  const timelineItems = useMemo<HomeTimelineItem[]>(() => {
    const items: HomeTimelineItem[] = [];

    if (latestLog) {
      const medicine = medicines.find((item) => item._id === latestLog.medicineId);
      const treatment = treatments.find((item) => item.id === latestLog.treatmentId);
      items.push({
        key: `taken-${latestLog.id}`,
        status: 'taken',
        date: new Date(latestLog.timestamp),
        medicineName: medicine ? medicine.alias?.trim() || medicine.nombre : 'Medicamento',
        detail: `${latestLog.amount} unidad(es)${treatment ? ` · ${treatment.title}` : ''}`,
        avatarName: user?.name ?? 'Toma registrada',
      });
    }

    for (const dose of upcomingDoses) {
      items.push({
        key: `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`,
        status: items.some((item) => item.status === 'next') ? 'pending' : 'next',
        date: new Date(dose.doseAt),
        medicineName: dose.medicineName,
        detail: `${dose.amount} unidad(es) · ${dose.treatmentTitle}`,
        avatarName: dose.patientName || dose.blisterName,
        dose,
      });
    }

    return items.slice(0, 4);
  }, [latestLog, medicines, treatments, upcomingDoses, user?.name]);

  const refreshUpcoming = useCallback(async () => {
    if (!activeBlisterId) {
      setUpcomingDoses([]);
      return;
    }

    const from = new Date();
    const to = new Date(from.getTime() + 48 * 60 * 60 * 1000);
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const list = await getUpcomingDoses({ from, to, blisterId: activeBlisterId });
      setUpcomingDoses(list.slice(0, 4));
    } catch (err) {
      setUpcomingError(isApiError(err) ? err.message : 'No se han podido cargar las próximas tomas.');
    } finally {
      setUpcomingLoading(false);
    }
  }, [activeBlisterId]);

  useEffect(() => {
    void refreshUpcoming();
  }, [refreshUpcoming]);

  const handleLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`;
    setLoggingDoseKey(key);
    try {
      await logDose({ treatmentId: dose.treatmentId, medicineId: dose.medicineId });
      await Promise.all([refetchMedicines(), refreshUpcoming()]);
      addToast({ message: `Toma registrada: ${dose.medicineName}.`, variant: 'success' });
    } catch (err) {
      const message = isStockInsufficientError(err)
        ? 'No hay stock suficiente para registrar esta toma desde Home.'
        : isApiError(err) ? err.message : 'No se ha podido registrar la toma.';
      addToast({ message, variant: 'error' });
    } finally {
      setLoggingDoseKey(null);
    }
  };

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

      {showLowStockAlert && lowStockMedicine && lowStockAlertKey ? (
        <article className="c-home-alert" role="alert">
          <span className="c-home-alert__icon" aria-hidden="true">
            <TbAlertTriangle className="c-icon c-icon--md" aria-hidden="true" />
          </span>
          <div className="c-home-alert__body">
            <p className="c-home-alert__text">
              Quedan {lowStockMedicine.stock} {lowStockMedicine.stockUnit} de {lowStockMedicine.alias?.trim() || lowStockMedicine.nombre}
            </p>
            <div className="c-home-alert__actions">
              <button
                type="button"
                className="c-home-alert__btn c-home-alert__btn--ghost"
                onClick={() => setDismissedLowStockAlertKey(lowStockAlertKey)}
              >
                Descartar
              </button>
              <button
                type="button"
                className="c-home-alert__btn c-home-alert__btn--solid"
                onClick={() => navigate(ROUTES.editMedicine(activeBlisterId, lowStockMedicine._id))}
              >
                Añadir más unidades
              </button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="c-home-next" aria-labelledby="home-next-title">
        <header className="c-home-next__header">
          <h2 id="home-next-title" className="c-home-next__title">Próximas dosis</h2>
          <p className="c-home-next__date">{todayLabel}</p>
        </header>

        {upcomingError ? (
          <ErrorState message={upcomingError} onRetry={() => void refreshUpcoming()} />
        ) : upcomingLoading ? (
          <div aria-busy="true">
            <Skeleton height="5rem" />
            <Skeleton height="5rem" />
          </div>
        ) : timelineItems.length === 0 ? (
          <EmptyState
            title="Sin próximas tomas"
            description="Cuando haya tratamientos activos, sus próximas dosis aparecerán aquí."
          />
        ) : (
          <ol className="c-home-next__timeline">
            {timelineItems.map((item) => {
              return (
                <li
                  key={item.key}
                  className={`c-home-next__item c-home-next__item--${item.status}`}
                >
                  <span className="c-home-next__time">
                    {timeFormatter.format(item.date)}
                  </span>

                  <span className="c-home-next__marker" aria-hidden="true">
                    {item.status === 'taken' ? (
                      <TbCheck className="c-icon c-icon--sm" aria-hidden="true" />
                    ) : (
                      <span className="c-home-next__marker-dot" />
                    )}
                  </span>

                  <article className="c-home-next__card">
                    <header className="c-home-next__card-header">
                      <span className="c-home-next__card-name">{item.medicineName}</span>
                      <Avatar name={item.avatarName} size="sm" />
                    </header>

                    <p className="c-home-next__card-detail">
                      {item.detail}
                    </p>

                    {item.status === 'taken' ? (
                      <span className="c-home-next__pill c-home-next__pill--taken">Tomado</span>
                    ) : item.status === 'next' && item.dose && (item.dose.callerRole === 'OWNER' || item.dose.callerRole === 'CAREGIVER') ? (
                      <div className="c-home-next__card-actions">
                        <button
                          type="button"
                          className="c-home-next__btn c-home-next__btn--solid"
                          disabled={loggingDoseKey === item.key}
                          onClick={() => item.dose ? void handleLogDose(item.dose) : undefined}
                        >
                          {loggingDoseKey === item.key ? 'Registrando...' : 'Marcar como tomado'}
                        </button>
                        <button
                          type="button"
                          className="c-home-next__btn c-home-next__btn--ghost"
                          onClick={() => item.dose ? navigate(ROUTES.editTreatment(item.dose.blisterId, item.dose.treatmentId)) : undefined}
                        >
                          Editar dosis
                        </button>
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}
