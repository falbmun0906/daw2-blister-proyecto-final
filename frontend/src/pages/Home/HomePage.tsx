import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbAlertTriangle, TbCheck } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Modal } from '../../components/atoms/Modal';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
import { UndoToast } from '../../components/molecules/UndoToast';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { ROUTES } from '../../constants/routes';
import { getUpcomingDoses, type UpcomingDose } from '../../services/me.service';
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

interface ActiveUndo {
  logId: string;
  createdAt: number;
  message: string;
}

const EARLY_DOSE_GRACE_MS = 5 * 60 * 1000;

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
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const addToast = useUiStore((s) => s.addToast);
  const { medicines, refetch: refetchMedicines } = useMedicines(activeBlisterId);
  const { logDose, undoLog } = useAdherence(activeBlisterId);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [earlyDose, setEarlyDose] = useState<UpcomingDose | null>(null);
  const [activeUndos, setActiveUndos] = useState<ActiveUndo[]>([]);
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

  const timelineItems = useMemo<HomeTimelineItem[]>(() => {
    const items = upcomingDoses.map<HomeTimelineItem>((dose, index) => ({
        key: `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`,
        status: index === 0 ? 'next' : 'pending',
        date: new Date(dose.doseAt),
        medicineName: dose.medicineName,
        detail: `${dose.amount} unidad(es) · ${dose.treatmentTitle}`,
        avatarName: dose.patientName || dose.blisterName,
        dose,
      }));

    return items.slice(0, 4);
  }, [upcomingDoses]);

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

  const dismissUndoToast = useCallback((logId: string) => {
    setActiveUndos((prev) => prev.filter((undo) => undo.logId !== logId));
  }, []);

  const performLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`;
    setLoggingDoseKey(key);
    try {
      const log = await logDose({
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        amount: dose.amount,
        timestamp: new Date(dose.doseAt),
      });
      setUpcomingDoses((prev) => prev.filter((item) => `${item.treatmentId}-${item.medicineId}-${item.doseAt}` !== key));
      await Promise.all([refetchMedicines(), refreshUpcoming()]);
      setActiveUndos((prev) => [
        ...prev,
        {
          logId: log.id,
          createdAt: Date.now(),
          message: `Toma registrada: ${dose.medicineName}.`,
        },
      ]);
    } catch (err) {
      const message = isStockInsufficientError(err)
        ? 'No hay stock suficiente para registrar esta toma desde Home.'
        : isApiError(err) ? err.message : 'No se ha podido registrar la toma.';
      addToast({ message, variant: 'error' });
    } finally {
      setLoggingDoseKey(null);
    }
  };

  const handleLogDose = async (dose: UpcomingDose): Promise<void> => {
    const doseTime = new Date(dose.doseAt).getTime();
    if (doseTime - Date.now() > EARLY_DOSE_GRACE_MS) {
      setEarlyDose(dose);
      return;
    }
    await performLogDose(dose);
  };

  const handleUndo = async (logId: string): Promise<void> => {
    dismissUndoToast(logId);
    try {
      await undoLog(logId);
      await Promise.all([refetchMedicines(), refreshUpcoming()]);
      addToast({ message: 'Toma deshecha.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido deshacer la toma.',
        variant: 'error',
      });
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

      <Modal
        open={earlyDose !== null}
        title="Aún no es la hora"
        onClose={() => setEarlyDose(null)}
      >
        <p className="c-home__modal-text">
          Esta toma está programada para las {earlyDose ? timeFormatter.format(new Date(earlyDose.doseAt)) : ''}.
        </p>
        <div className="c-home__modal-actions">
          <Button type="button" variant="primary-outline" onClick={() => setEarlyDose(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (!earlyDose) return;
              const dose = earlyDose;
              setEarlyDose(null);
              void performLogDose(dose);
            }}
          >
            Marcar como tomada
          </Button>
        </div>
      </Modal>

      {activeUndos.length > 0 ? (
        <div className="c-home__undo-stack" aria-live="polite">
          {activeUndos.map((undo) => (
            <UndoToast
              key={undo.logId}
              logId={undo.logId}
              message={undo.message}
              createdAt={undo.createdAt}
              onUndo={(id) => void handleUndo(id)}
              onExpire={dismissUndoToast}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
