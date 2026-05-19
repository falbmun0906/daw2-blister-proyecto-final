import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbAlertTriangle, TbCheck } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Modal } from '../../components/atoms/Modal';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ActionMenuButton } from '../../components/molecules/ActionMenuButton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useBlisters } from '../../hooks/use.blisters';
import { useNotifications, useRefreshNotifications } from '../../hooks/use.notifications';
import { ADHERENCE_UNDO_WINDOW_MS } from '../../constants/ui.constants';
import { ROUTES } from '../../constants/routes';
import { isExpiredAppointmentReminderAlert } from '../../lib/home-alerts';
import { getNotificationTargetRoute } from '../../lib/notification-routing';
import { listMedicines } from '../../services/medicines.service';
import { getUpcomingDoses, type UpcomingDose } from '../../services/me.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Medicine } from '../../types/medicine.types';
import type { NotificationView } from '../../types/notification.types';

interface HomeTimelineItem {
  key: string;
  status: 'taken' | 'skipped' | 'missed' | 'next' | 'pending';
  timeLabel: string;
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
  treatmentId: string;
  medicineId: string;
  status: 'taken' | 'skipped';
  createdAt: number;
  medicineName: string;
  treatmentTitle: string;
  patientName: string;
  patientAvatarKey: string | null;
  doseAt: string;
  displayTime: string | null;
}

type HomeMedicine = Medicine & {
  blisterName: string;
};

interface HomeAlertItem {
  key: string;
  title: string;
  detail: string;
  context: string;
  actionLabel: string;
  actionRoute: string;
  notification?: NotificationView;
}

interface DoseActionMenu {
  key: string;
  dose: UpcomingDose;
}

const EARLY_DOSE_GRACE_MS = 5 * 60 * 1000;
const HOME_ALERT_NOTIFICATION_TYPES = new Set<string>([
  'expiration_warning',
  'cima_change',
  'appointment_reminder',
  'system',
]);

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const todayFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
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
  return todayFormatter.format(new Date());
}

function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getEndOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

function getDoseKey(entry: { treatmentId: string; medicineId: string; doseAt: string }): string {
  return `${entry.treatmentId}-${entry.medicineId}-${entry.doseAt}`;
}

function getNotificationContext(notification: NotificationView): string {
  switch (notification.type) {
    case 'stock_low':
    case 'stock_depleted':
    case 'expiration_warning':
      return 'Botiquín';
    case 'cima_change':
      return 'CIMA';
    case 'appointment_reminder':
      return 'Citas médicas';
    case 'system':
    default:
      return 'Aviso';
  }
}

function getNotificationActionLabel(notification: NotificationView): string {
  switch (notification.type) {
    case 'stock_low':
    case 'stock_depleted':
      return 'Añadir más unidades';
    case 'expiration_warning':
      return 'Revisar medicamento';
    case 'cima_change':
      return 'Ver en CIMA';
    case 'appointment_reminder':
      return 'Ver citas';
    case 'system':
    default:
      return 'Ver aviso';
  }
}

function getStringMetadata(notification: NotificationView, key: string): string | null {
  const value = notification.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
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
  itemRef?: React.Ref<HTMLLIElement>;
}

function InlineUndoDose({ undo, onUndo, onExpire, itemRef }: InlineUndoDoseProps) {
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
    <li ref={itemRef} className={`c-home-next__item c-home-next__item--${undo.status} c-home-next__item--undo`}>
      <span className="c-home-next__time">{undo.displayTime ?? timeFormatter.format(date)}</span>
      <span className="c-home-next__marker" aria-hidden="true">
        {undo.status === 'taken' ? (
          <TbCheck className="c-icon c-icon--sm" aria-hidden="true" />
        ) : (
          <span className="c-home-next__marker-dot" />
        )}
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
          {undo.status === 'taken' ? 'Registrada ahora' : 'Omitida ahora'} · {undo.treatmentTitle}
        </p>
        <div className="c-home-next__undo-actions">
          <button
            type="button"
            className="c-home-next__btn c-home-next__btn--undo"
            onClick={() => onUndo(undo.logId)}
          >
            Deshacer ({formatRemaining(remaining)})
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
  const { notifications, dismiss: dismissNotification } = useNotifications({ limit: 12 });
  const alertMenuRef = useRef<HTMLElement | null>(null);
  const doseMenuRef = useRef<HTMLDivElement | null>(null);
  const timelineAnchorRef = useRef<HTMLLIElement | null>(null);
  const nextTimelineItemRef = useRef<HTMLLIElement | null>(null);
  const hasInitialTimelinePositionedRef = useRef(false);
  const appliedTimelineFocusKeyRef = useRef<string | null>(null);
  const [homeMedicines, setHomeMedicines] = useState<HomeMedicine[]>([]);
  const [homeMedicinesLoading, setHomeMedicinesLoading] = useState(false);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [skippingDoseKey, setSkippingDoseKey] = useState<string | null>(null);
  const [earlyDose, setEarlyDose] = useState<UpcomingDose | null>(null);
  const [skipDoseCandidate, setSkipDoseCandidate] = useState<UpcomingDose | null>(null);
  const [activeUndos, setActiveUndos] = useState<ActiveUndo[]>([]);
  const [timelineNow, setTimelineNow] = useState(() => Date.now());
  const [timelineFocusKey, setTimelineFocusKey] = useState<string | null>(null);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => new Set());
  const [expiredUndoIds, setExpiredUndoIds] = useState<Set<string>>(() => new Set());
  const [alertDismissCandidateKey, setAlertDismissCandidateKey] = useState<string | null>(null);
  const [openAlertMenuKey, setOpenAlertMenuKey] = useState<string | null>(null);
  const [openDoseMenu, setOpenDoseMenu] = useState<DoseActionMenu | null>(null);

  const todayLabel = useMemo(() => formatTodayLabel(), []);
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

  const alertItems = useMemo<HomeAlertItem[]>(() => {
    const notificationAlerts = notifications.flatMap<HomeAlertItem>((notification) => (
      HOME_ALERT_NOTIFICATION_TYPES.has(notification.type)
        && !isExpiredAppointmentReminderAlert(notification, timelineNow)
        ? [{
          key: `notification:${notification.id}`,
          title: notification.title,
          detail: getStringMetadata(notification, 'medicineName')
            ? `${getStringMetadata(notification, 'medicineName')} · ${notification.message}`
            : notification.message,
          context: getNotificationContext(notification),
          actionLabel: getNotificationActionLabel(notification),
          actionRoute: getNotificationTargetRoute(notification) ?? ROUTES.notifications,
          notification,
        }]
        : []
    ));
    const stockAlerts = homeMedicines.flatMap<HomeAlertItem>((medicine) => (
      medicine.stock <= medicine.threshold
        ? [{
          key: `stock:${medicine._id}:${medicine.stock}:${medicine.threshold}`,
          title: 'Stock bajo',
          detail: `Quedan ${medicine.stock} ${medicine.stockUnit} de ${medicine.alias?.trim() || medicine.nombre}`,
          context: medicine.blisterName,
          actionLabel: 'Añadir más unidades',
          actionRoute: ROUTES.editMedicine(medicine.blisterId, medicine._id),
        }]
        : []
    ));

    return [...notificationAlerts, ...stockAlerts]
      .filter((item) => !dismissedAlertKeys.has(item.key));
  }, [dismissedAlertKeys, homeMedicines, notifications, timelineNow]);
  const showAlertZone = !homeMedicinesLoading && alertItems.length > 0;
  const alertDismissCandidate = alertDismissCandidateKey
    ? alertItems.find((item) => item.key === alertDismissCandidateKey) ?? null
    : null;
  const openAlertMenu = openAlertMenuKey
    ? alertItems.find((item) => item.key === openAlertMenuKey) ?? null
    : null;
  const activeUndoByDoseKey = useMemo(() => {
    const byDoseKey = new Map<string, ActiveUndo>();
    const addUndo = (undo: ActiveUndo): void => {
      if (expiredUndoIds.has(undo.logId)) return;
      if (timelineNow - undo.createdAt >= ADHERENCE_UNDO_WINDOW_MS) return;
      byDoseKey.set(getDoseKey(undo), undo);
    };

    for (const dose of upcomingDoses) {
      if ((!dose.isTaken && !dose.isSkipped) || !dose.adherenceLogId || !dose.adherenceCreatedAt) continue;
      const createdAt = Date.parse(dose.adherenceCreatedAt);
      if (!Number.isFinite(createdAt)) continue;
      addUndo({
        logId: dose.adherenceLogId,
        blisterId: dose.blisterId,
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        status: dose.isSkipped ? 'skipped' : 'taken',
        createdAt,
        medicineName: dose.medicineName,
        treatmentTitle: dose.treatmentTitle,
        patientName: dose.patientName || dose.blisterName,
        patientAvatarKey: dose.patientAvatarKey,
        doseAt: dose.doseAt,
        displayTime: dose.displayTime,
      });
    }

    for (const undo of activeUndos) {
      addUndo(undo);
    }

    return byDoseKey;
  }, [activeUndos, expiredUndoIds, timelineNow, upcomingDoses]);
  const activeUndoByLogId = useMemo(
    () => new Map([...activeUndoByDoseKey.values()].map((undo) => [undo.logId, undo])),
    [activeUndoByDoseKey],
  );

  const timelineItems = useMemo<HomeTimelineItem[]>(() => {
    const sortedDoses = upcomingDoses
      .toSorted((left, right) => new Date(left.doseAt).getTime() - new Date(right.doseAt).getTime());
    const now = timelineNow;
    const nextDoseKey = sortedDoses
      .find((dose) => !dose.isTaken && !dose.isSkipped && new Date(dose.doseAt).getTime() >= now);

    const items = sortedDoses.map<HomeTimelineItem>((dose) => {
      const key = getDoseKey(dose);
      const doseTime = new Date(dose.doseAt).getTime();
      const status = dose.isTaken
        ? 'taken'
        : dose.isSkipped
          ? 'skipped'
          : nextDoseKey && key === getDoseKey(nextDoseKey)
            ? 'next'
            : doseTime < now
              ? 'missed'
              : 'pending';

      return {
        key,
        status,
        timeLabel: dose.displayTime ?? timeFormatter.format(new Date(dose.doseAt)),
        medicineName: dose.medicineName,
        detail: `${dose.amount} unidad(es) · ${dose.treatmentTitle} · ${dose.blisterName}`,
        avatarName: dose.patientName || dose.blisterName,
        avatarKey: dose.patientAvatarKey,
        avatarTooltip: dose.patientName || dose.blisterName,
        dose,
      };
    });

    return items;
  }, [timelineNow, upcomingDoses]);
  const nextTimelineItemKey = timelineItems.find((item) => item.status === 'next')?.key ?? null;

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

    const from = getStartOfToday();
    const to = getEndOfToday();
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const list = await getUpcomingDoses({ from, to, includeTaken: true });
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

  useEffect(() => {
    const updateCurrentTime = () => setTimelineNow(Date.now());
    updateCurrentTime();
    const intervalId = window.setInterval(updateCurrentTime, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!openAlertMenuKey) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!alertMenuRef.current?.contains(event.target as Node)) {
        setOpenAlertMenuKey(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openAlertMenuKey]);

  useEffect(() => {
    if (!openDoseMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!doseMenuRef.current?.contains(event.target as Node)) {
        setOpenDoseMenu(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openDoseMenu]);

  useLayoutEffect(() => {
    if (timelineFocusKey && appliedTimelineFocusKeyRef.current !== timelineFocusKey) {
      timelineAnchorRef.current?.scrollIntoView({ block: 'nearest' });
      appliedTimelineFocusKeyRef.current = timelineFocusKey;
      return;
    }
    if (upcomingLoading || hasInitialTimelinePositionedRef.current || !nextTimelineItemKey) return;
    nextTimelineItemRef.current?.scrollIntoView({ block: 'start' });
    hasInitialTimelinePositionedRef.current = true;
  }, [nextTimelineItemKey, timelineFocusKey, upcomingLoading]);

  const dismissUndoToast = useCallback((logId: string) => {
    setExpiredUndoIds((current) => new Set(current).add(logId));
    setActiveUndos((prev) => prev.filter((undo) => undo.logId !== logId));
  }, []);

  const performLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = getDoseKey(dose);
    setLoggingDoseKey(key);
    try {
      const log = await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        amount: dose.amount,
        timestamp: new Date(dose.doseAt),
      });
      setActiveUndos((prev) => [
        {
          logId: log.id,
          blisterId: dose.blisterId,
          treatmentId: dose.treatmentId,
          medicineId: dose.medicineId,
          status: 'taken',
          createdAt: Date.parse(log.createdAt),
          medicineName: dose.medicineName,
          treatmentTitle: dose.treatmentTitle,
          patientName: dose.patientName || dose.blisterName,
          patientAvatarKey: dose.patientAvatarKey,
          doseAt: dose.doseAt,
          displayTime: dose.displayTime,
        },
        ...prev.filter((undo) => getDoseKey(undo) !== key),
      ]);
      appliedTimelineFocusKeyRef.current = null;
      setTimelineFocusKey(key);
      await Promise.all([refreshHomeMedicines(), refreshUpcoming(), refreshNotifications()]);
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

  const performSkipDose = async (dose: UpcomingDose): Promise<void> => {
    const key = getDoseKey(dose);
    setSkippingDoseKey(key);
    try {
      const log = await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        status: 'skipped',
        timestamp: new Date(dose.doseAt),
        notes: 'Toma omitida desde Home.',
      });
      setActiveUndos((prev) => [
        {
          logId: log.id,
          blisterId: dose.blisterId,
          treatmentId: dose.treatmentId,
          medicineId: dose.medicineId,
          status: 'skipped',
          createdAt: Date.parse(log.createdAt),
          medicineName: dose.medicineName,
          treatmentTitle: dose.treatmentTitle,
          patientName: dose.patientName || dose.blisterName,
          patientAvatarKey: dose.patientAvatarKey,
          doseAt: dose.doseAt,
          displayTime: dose.displayTime,
        },
        ...prev.filter((undo) => getDoseKey(undo) !== key),
      ]);
      appliedTimelineFocusKeyRef.current = null;
      setTimelineFocusKey(key);
      setSkipDoseCandidate(null);
      await Promise.all([refreshUpcoming(), refreshNotifications()]);
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido omitir la toma.',
        variant: 'error',
      });
    } finally {
      setSkippingDoseKey(null);
    }
  };

  const handleUndo = async (logId: string): Promise<void> => {
    const undo = activeUndoByLogId.get(logId);
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

  const handleConfirmDismissAlert = async (): Promise<void> => {
    if (!alertDismissCandidate) {
      setAlertDismissCandidateKey(null);
      return;
    }

    try {
      if (alertDismissCandidate.notification) {
        await dismissNotification(alertDismissCandidate.notification);
      }
      setDismissedAlertKeys((current) => new Set(current).add(alertDismissCandidate.key));
      setAlertDismissCandidateKey(null);
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido descartar el aviso.',
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

  const earlyDoseDisplayTime = earlyDose
    ? earlyDose.displayTime ?? timeFormatter.format(new Date(earlyDose.doseAt))
    : '';

  return (
    <section className="c-home" aria-label="Resumen de todos tus blísteres">
      {searchBlister ? (
        <CimaSearchDropdown
          blisterId={searchBlister._id}
          canMutate={canSearchBlisterMutate}
        />
      ) : null}

      {showAlertZone ? (
        <section ref={alertMenuRef} className="c-home-alert" aria-label="Avisos">
          <div className="c-home-alert__viewport">
            {alertItems.map((alert) => (
              <div key={alert.key} className="c-home-alert__slide">
                <header className="c-home-alert__card-header">
                  <span className="c-home-alert__icon" aria-hidden="true">
                    <TbAlertTriangle className="c-icon c-icon--sm" aria-hidden="true" />
                  </span>
                  <div className="c-home-alert__header-copy">
                    <span className="c-home-alert__title">{alert.title}</span>
                    <span className="c-home-alert__context">{alert.context}</span>
                  </div>
                  <div className="c-action-menu c-home-alert__menu">
                    <ActionMenuButton
                      className="c-home-alert__menu-toggle"
                      label="Acciones del aviso"
                      aria-haspopup="menu"
                      aria-expanded={openAlertMenuKey === alert.key}
                      onClick={() => setOpenAlertMenuKey((current) => current === alert.key ? null : alert.key)}
                    />
                  </div>
                </header>
                <div className="c-home-alert__body">
                  <p className="c-home-alert__detail">{alert.detail}</p>
                </div>
              </div>
            ))}
          </div>
          {openAlertMenu ? (
            <div className="c-action-menu__popover c-home-alert__menu-popover" role="menu">
              <button
                type="button"
                className="c-action-menu__item"
                role="menuitem"
                onClick={() => {
                  setOpenAlertMenuKey(null);
                  void navigate(openAlertMenu.actionRoute);
                }}
              >
                <span>{openAlertMenu.actionLabel}</span>
              </button>
              <button
                type="button"
                className="c-action-menu__item"
                role="menuitem"
                onClick={() => {
                  setOpenAlertMenuKey(null);
                  setAlertDismissCandidateKey(openAlertMenu.key);
                }}
              >
                <span>Descartar</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="c-home-next" aria-labelledby="home-next-title">
        <header className="c-home-next__header">
          <h2 id="home-next-title" className="c-home-next__title">Próximas dosis</h2>
          <p className="c-home-next__date">{todayLabel}</p>
        </header>

        {upcomingError ? (
          <ErrorState message={upcomingError} onRetry={() => void refreshUpcoming()} />
        ) : upcomingLoading && timelineItems.length === 0 && activeUndos.length === 0 ? (
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
            {timelineItems.map((item) => {
              const activeUndo = activeUndoByDoseKey.get(item.key);
              if (activeUndo) {
                return (
                  <InlineUndoDose
                    key={activeUndo.logId}
                    undo={activeUndo}
                    onUndo={(id) => void handleUndo(id)}
                    onExpire={dismissUndoToast}
                    itemRef={item.key === timelineFocusKey ? timelineAnchorRef : undefined}
                  />
                );
              }

              return (
                <li
                  key={item.key}
                  ref={item.key === timelineFocusKey ? timelineAnchorRef : item.key === nextTimelineItemKey ? nextTimelineItemRef : undefined}
                  className={`c-home-next__item c-home-next__item--${item.status}`}
                >
                  <span className="c-home-next__time">
                    {item.timeLabel}
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
                    ) : item.status === 'skipped' ? (
                      <span className="c-home-next__pill c-home-next__pill--skipped">Omitida</span>
                    ) : item.dose && (item.status === 'next' || item.status === 'missed') && (item.dose.callerRole === 'OWNER' || item.dose.callerRole === 'CAREGIVER') ? (
                      <div className="c-home-next__card-actions">
                        <button
                          type="button"
                          className="c-home-next__btn c-home-next__btn--solid"
                          disabled={loggingDoseKey === item.key}
                          onClick={() => item.dose ? void handleLogDose(item.dose) : undefined}
                        >
                          {loggingDoseKey === item.key ? 'Registrando...' : 'Marcar toma'}
                        </button>
                        <div
                          className="c-action-menu c-home-next__action-menu"
                          ref={openDoseMenu?.key === item.key ? doseMenuRef : undefined}
                        >
                          <ActionMenuButton
                            className="c-home-next__menu-toggle"
                            label="Acciones de la toma"
                            aria-haspopup="menu"
                            aria-expanded={openDoseMenu?.key === item.key}
                            onClick={() => {
                              const dose = item.dose;
                              if (!dose) return;
                              setOpenDoseMenu((current) => current?.key === item.key ? null : { key: item.key, dose });
                            }}
                          />
                          {openDoseMenu?.key === item.key ? (
                            <div className="c-action-menu__popover c-home-next__menu-popover" role="menu">
                              <button
                                type="button"
                                className="c-action-menu__item"
                                role="menuitem"
                                onClick={() => {
                                  const dose = item.dose;
                                  if (!dose) return;
                                  setOpenDoseMenu(null);
                                  navigate(ROUTES.treatmentDetail(dose.blisterId, dose.treatmentId));
                                }}
                              >
                                Ver tratamiento
                              </button>
                              <button
                                type="button"
                                className="c-action-menu__item"
                                role="menuitem"
                                disabled={skippingDoseKey === item.key}
                                onClick={() => {
                                  const dose = item.dose;
                                  if (!dose) return;
                                  setOpenDoseMenu(null);
                                  setSkipDoseCandidate(dose);
                                }}
                              >
                                {skippingDoseKey === item.key ? 'Omitiendo...' : 'Omitir'}
                              </button>
                            </div>
                          ) : null}
                        </div>
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
          Esta toma está programada para las {earlyDoseDisplayTime}.
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
        open={skipDoseCandidate !== null}
        title="Omitir toma"
        hideCloseButton
        onClose={() => setSkipDoseCandidate(null)}
      >
        <p className="c-home__modal-text">
          ¿Seguro que quieres omitir esta toma? Quedará registrada como omitida y no se descontará stock.
        </p>
        <div className="c-home__modal-actions">
          <Button type="button" variant="primary-outline" onClick={() => setSkipDoseCandidate(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={skipDoseCandidate ? skippingDoseKey === getDoseKey(skipDoseCandidate) : false}
            onClick={() => {
              if (!skipDoseCandidate) return;
              void performSkipDose(skipDoseCandidate);
            }}
          >
            {skipDoseCandidate && skippingDoseKey === getDoseKey(skipDoseCandidate) ? 'Omitiendo...' : 'Omitir toma'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={alertDismissCandidateKey !== null}
        title="Descartar aviso"
        onClose={() => setAlertDismissCandidateKey(null)}
      >
        <p className="c-home__modal-text">
          Este aviso dejará de mostrarse en Inicio. Podrás seguir revisando los avisos activos desde Notificaciones cuando corresponda.
        </p>
        <div className="c-home__modal-actions">
          <Button type="button" variant="primary-outline" onClick={() => setAlertDismissCandidateKey(null)}>
            Seguir avisando
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void handleConfirmDismissAlert()}
          >
            Descartar aviso
          </Button>
        </div>
      </Modal>
    </section>
  );
}
