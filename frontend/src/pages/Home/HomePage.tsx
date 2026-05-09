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
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useBlisters } from '../../hooks/use.blisters';
import { useRefreshNotifications } from '../../hooks/use.notifications';
import { ADHERENCE_UNDO_WINDOW_MS } from '../../constants/ui.constants';
import { ROUTES } from '../../constants/routes';
import { listMedicines } from '../../services/medicines.service';
import { getUpcomingDoses, type UpcomingDose } from '../../services/me.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Medicine } from '../../types/medicine.types';

interface HomeTimelineItem {
  key: string;
  status: 'taken' | 'next' | 'pending';
  date: Date;
  medicineName: string;
  detail: string;
  avatarName: string;
  avatarKey: string | null;
  avatarTooltip: string;
  dose?: UpcomingDose;
}

interface ActiveUndo {
  logId: string;
  blisterId: string;
  createdAt: number;
  medicineName: string;
  treatmentTitle: string;
  patientName: string;
  patientAvatarKey: string | null;
  doseAt: string;
}

type HomeMedicine = Medicine & {
  blisterName: string;
};

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
  const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });
  const from = new Date();
  const to = new Date(from.getTime() + 3 * 24 * 60 * 60 * 1000);
  return `${formatter.format(from)} - ${formatter.format(to)}`;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function isOutsideEarlyDoseGrace(doseAt: string): boolean {
  return new Date(doseAt).getTime() - Date.now() > EARLY_DOSE_GRACE_MS;
}

interface InlineUndoDoseProps {
  undo: ActiveUndo;
  onUndo: (logId: string) => void;
  onExpire: (logId: string) => void;
}

function InlineUndoDose({ undo, onUndo, onExpire }: InlineUndoDoseProps) {
  const expiresAt = undo.createdAt + ADHERENCE_UNDO_WINDOW_MS;
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const date = new Date(undo.doseAt);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = Math.max(0, expiresAt - Date.now());
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(interval);
        onExpire(undo.logId);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, onExpire, undo.logId]);

  if (remaining <= 0) return null;

  return (
    <li className="c-home-next__item c-home-next__item--taken c-home-next__item--undo">
      <span className="c-home-next__time">{timeFormatter.format(date)}</span>
      <span className="c-home-next__marker" aria-hidden="true">
        <TbCheck className="c-icon c-icon--sm" aria-hidden="true" />
      </span>
      <article className="c-home-next__card c-home-next__card--undo">
        <header className="c-home-next__card-header">
          <span className="c-home-next__card-name">{undo.medicineName}</span>
          <span title={undo.patientName}>
            <Avatar
              name={undo.patientName}
              avatarKey={undo.patientAvatarKey ?? undefined}
              size="sm"
            />
          </span>
        </header>
        <p className="c-home-next__card-detail">
          Registrada ahora · {undo.treatmentTitle}
        </p>
        <div className="c-home-next__undo-actions">
          <span className="c-home-next__undo-timer" aria-label="Tiempo restante para deshacer">
            {formatRemaining(remaining)}
          </span>
          <button
            type="button"
            className="c-home-next__btn c-home-next__btn--ghost"
            onClick={() => onUndo(undo.logId)}
          >
            Deshacer
          </button>
        </div>
      </article>
    </li>
  );
}

/** Pantalla raíz autenticada. Muestra alertas y próximas dosis del blíster activo. */
export default function HomePage() {
  const navigate = useNavigate();
  const { isLoading, error, refresh } = useBlisters();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const addToast = useUiStore((s) => s.addToast);
  const { logDoseInBlister, undoLogInBlister } = useAdherence(activeBlisterId);
  const refreshNotifications = useRefreshNotifications();
  const [homeMedicines, setHomeMedicines] = useState<HomeMedicine[]>([]);
  const [homeMedicinesLoading, setHomeMedicinesLoading] = useState(false);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [earlyDose, setEarlyDose] = useState<UpcomingDose | null>(null);
  const [activeUndos, setActiveUndos] = useState<ActiveUndo[]>([]);
  const [dismissedLowStockAlertKey, setDismissedLowStockAlertKey] = useState<string | null>(null);
  const [lowStockDismissCandidate, setLowStockDismissCandidate] = useState<string | null>(null);

  const todayLabel = useMemo(() => formatTodayLabel(), []);
  const lowStockMedicine = useMemo(
    () => homeMedicines.find((medicine) => medicine.stock <= medicine.threshold) ?? null,
    [homeMedicines],
  );
  const lowStockAlertKey = lowStockMedicine
    ? `${lowStockMedicine._id}-${lowStockMedicine.stock}-${lowStockMedicine.threshold}`
    : null;
  const showLowStockAlert = !homeMedicinesLoading && Boolean(lowStockMedicine && lowStockAlertKey !== dismissedLowStockAlertKey);
  const searchBlister = useMemo(
    () => blisters.find((blister) => blister._id === activeBlisterId) ?? blisters[0] ?? null,
    [activeBlisterId, blisters],
  );
  const searchRole = useMemo(
    () =>
      searchBlister?.members.find((member) => member.userId === userId)?.role ??
      (searchBlister?._id === activeBlisterId ? activeRole : null),
    [activeBlisterId, activeRole, searchBlister, userId],
  );
  const canSearchBlisterMutate = searchRole === 'OWNER' || searchRole === 'CAREGIVER';

  const timelineItems = useMemo<HomeTimelineItem[]>(() => {
    const items = upcomingDoses.map<HomeTimelineItem>((dose, index) => ({
        key: `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`,
        status: index === 0 ? 'next' : 'pending',
        date: new Date(dose.doseAt),
        medicineName: dose.medicineName,
        detail: `${dose.amount} unidad(es) · ${dose.treatmentTitle} · ${dose.blisterName}`,
        avatarName: dose.patientName || dose.blisterName,
        avatarKey: dose.patientAvatarKey,
        avatarTooltip: dose.patientName || dose.blisterName,
        dose,
      }));

    return items;
  }, [upcomingDoses]);

  const refreshHomeMedicines = useCallback(async () => {
    if (blisters.length === 0) {
      setHomeMedicines([]);
      return;
    }

    setHomeMedicinesLoading(true);
    try {
      const results = await Promise.all(
        blisters.map(async (blister) => {
          const items = await listMedicines(blister._id);
          return items.map<HomeMedicine>((medicine) => ({
            ...medicine,
            blisterName: blister.name,
          }));
        }),
      );
      setHomeMedicines(results.flat());
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se han podido cargar las alertas del botiquín.',
        variant: 'error',
      });
    } finally {
      setHomeMedicinesLoading(false);
    }
  }, [addToast, blisters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshHomeMedicines();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshHomeMedicines]);

  const refreshUpcoming = useCallback(async () => {
    if (blisters.length === 0) {
      setUpcomingDoses([]);
      return;
    }

    const from = new Date();
    const to = new Date(from.getTime() + 72 * 60 * 60 * 1000);
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const list = await getUpcomingDoses({ from, to });
      setUpcomingDoses(list);
    } catch (err) {
      setUpcomingError(isApiError(err) ? err.message : 'No se han podido cargar las próximas tomas.');
    } finally {
      setUpcomingLoading(false);
    }
  }, [blisters.length]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUpcoming();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshUpcoming]);

  const dismissUndoToast = useCallback((logId: string) => {
    setActiveUndos((prev) => prev.filter((undo) => undo.logId !== logId));
  }, []);

  const performLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`;
    setLoggingDoseKey(key);
    try {
      const log = await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        amount: dose.amount,
        timestamp: new Date(dose.doseAt),
      });
      setUpcomingDoses((prev) => prev.filter((item) => `${item.treatmentId}-${item.medicineId}-${item.doseAt}` !== key));
      await Promise.all([refreshHomeMedicines(), refreshUpcoming(), refreshNotifications()]);
      setActiveUndos((prev) => [
        {
          logId: log.id,
          blisterId: dose.blisterId,
          createdAt: Date.now(),
          medicineName: dose.medicineName,
          treatmentTitle: dose.treatmentTitle,
          patientName: dose.patientName || dose.blisterName,
          patientAvatarKey: dose.patientAvatarKey,
          doseAt: dose.doseAt,
        },
        ...prev,
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
    if (isOutsideEarlyDoseGrace(dose.doseAt)) {
      setEarlyDose(dose);
      return;
    }
    await performLogDose(dose);
  };

  const handleUndo = async (logId: string): Promise<void> => {
    const undo = activeUndos.find((item) => item.logId === logId);
    if (!undo) return;
    dismissUndoToast(logId);
    try {
      await undoLogInBlister(undo.blisterId, logId);
      await Promise.all([refreshHomeMedicines(), refreshUpcoming(), refreshNotifications()]);
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

  if (blisters.length === 0) {
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
    <section className="c-home" aria-label="Resumen de todos tus blísteres">
      {searchBlister ? (
        <CimaSearchDropdown
          blisterId={searchBlister._id}
          canMutate={canSearchBlisterMutate}
        />
      ) : null}

      {showLowStockAlert && lowStockMedicine && lowStockAlertKey ? (
        <article className="c-home-alert" role="alert">
          <span className="c-home-alert__icon" aria-hidden="true">
            <TbAlertTriangle className="c-icon c-icon--md" aria-hidden="true" />
          </span>
          <div className="c-home-alert__body">
            <p className="c-home-alert__text">
              Quedan {lowStockMedicine.stock} {lowStockMedicine.stockUnit} de {lowStockMedicine.alias?.trim() || lowStockMedicine.nombre}
              <span className="c-home-alert__context"> {lowStockMedicine.blisterName}</span>
            </p>
            <div className="c-home-alert__actions">
              <button
                type="button"
                className="c-home-alert__btn c-home-alert__btn--ghost"
                onClick={() => setLowStockDismissCandidate(lowStockAlertKey)}
              >
                Descartar
              </button>
              <button
                type="button"
                className="c-home-alert__btn c-home-alert__btn--solid"
                onClick={() => navigate(ROUTES.editMedicine(lowStockMedicine.blisterId, lowStockMedicine._id))}
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
        ) : timelineItems.length === 0 && activeUndos.length === 0 ? (
          <EmptyState
            title="Sin próximas tomas"
            description="Cuando haya tratamientos activos, sus próximas dosis aparecerán aquí."
          />
        ) : (
          <ol className="c-home-next__timeline">
            {activeUndos.map((undo) => (
              <InlineUndoDose
                key={undo.logId}
                undo={undo}
                onUndo={(id) => void handleUndo(id)}
                onExpire={dismissUndoToast}
              />
            ))}
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
                      <span title={item.avatarTooltip}>
                        <Avatar
                          name={item.avatarName}
                          avatarKey={item.avatarKey ?? undefined}
                          size="sm"
                        />
                      </span>
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
        hideCloseButton
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
            Tomar ahora
          </Button>
        </div>
      </Modal>

      <Modal
        open={lowStockDismissCandidate !== null}
        title="Descartar aviso de stock"
        onClose={() => setLowStockDismissCandidate(null)}
      >
        <p className="c-home__modal-text">
          Este aviso puede pertenecer a un tratamiento activo. Si lo descartas, dejará de mostrarse en Inicio hasta que cambie el stock o el umbral.
        </p>
        <div className="c-home__modal-actions">
          <Button type="button" variant="primary-outline" onClick={() => setLowStockDismissCandidate(null)}>
            Seguir avisando
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (lowStockDismissCandidate) setDismissedLowStockAlertKey(lowStockDismissCandidate);
              setLowStockDismissCandidate(null);
            }}
          >
            Descartar aviso
          </Button>
        </div>
      </Modal>
    </section>
  );
}
