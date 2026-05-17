import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { TbCalendar, TbCheck, TbChevronLeft, TbChevronRight, TbPill, TbPlus } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ActionMenuButton } from '../../components/molecules/ActionMenuButton';
import { AppointmentCard } from '../../components/organisms/AppointmentCard';
import {
  CALENDAR_INITIAL_VISIBLE_ITEMS,
  CALENDAR_SHOW_MORE_INCREMENT,
} from '../../constants/calendar';
import { ROUTES } from '../../constants/routes';
import { ADHERENCE_UNDO_WINDOW_MS } from '../../constants/ui.constants';
import { isStockInsufficientError, useAdherence } from '../../hooks/use.adherence';
import { useAppointments } from '../../hooks/use.appointments';
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { getCalendar, type UpcomingDose } from '../../services/me.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Appointment } from '../../types/appointment.types';

type CalendarView = 'pillbox' | 'appointments';

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const capitalizeFirst = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfToday = (): Date => startOfDay(new Date());

const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfNextMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1);

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const buildWindowDays = (start: Date, visibleDays: number): Date[] =>
  Array.from({ length: visibleDays }, (_, index) => addDays(start, index));

const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const getDoseKey = (dose: Pick<UpcomingDose, 'treatmentId' | 'medicineId' | 'doseAt'>): string =>
  `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const formatMonthTitle = (date: Date): string =>
  capitalizeFirst(monthFormatter.format(date));

const formatDayLabel = (date: Date): string =>
  capitalizeFirst(longDateFormatter.format(date).replace(',', ''));

interface AppointmentDayGroup {
  key: string;
  day: Date;
  appointments: Appointment[];
}

interface DoseUndoButtonProps {
  logId: string;
  createdAt: number;
  onUndo: (logId: string) => void;
  onExpire: (logId: string) => void;
}

function DoseUndoButton({ logId, createdAt, onUndo, onExpire }: DoseUndoButtonProps) {
  const expiresAt = createdAt + ADHERENCE_UNDO_WINDOW_MS;
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = Math.max(0, expiresAt - Date.now());
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(intervalId);
        onExpire(logId);
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt, logId, onExpire]);

  if (remaining <= 0) return null;

  return (
    <button
      type="button"
      className="c-dose-row__btn c-dose-row__btn--undo"
      onClick={() => onUndo(logId)}
    >
      Deshacer ({formatRemaining(remaining)})
    </button>
  );
}

const groupAppointmentsByDay = (appointments: Appointment[]): AppointmentDayGroup[] => {
  const groups = new Map<string, AppointmentDayGroup>();

  for (const appointment of appointments) {
    const day = startOfDay(new Date(appointment.date));
    const key = dayKey(day);
    const group = groups.get(key);

    if (group) {
      group.appointments.push(appointment);
    } else {
      groups.set(key, { key, day, appointments: [appointment] });
    }
  }

  return [...groups.values()];
};

interface MonthCalendarProps {
  cursor: Date;
  selected: Date | null;
  doseDays: Set<string>;
  appointmentDays: Set<string>;
  onSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function MonthCalendar({
  cursor,
  selected,
  doseDays,
  appointmentDays,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const today = new Date();
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstWeekDay = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date; outside: boolean }> = [];

  for (let index = firstWeekDay; index > 0; index -= 1) {
    cells.push({
      date: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - index),
      outside: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), outside: false });
  }

  while (cells.length < 42) {
    const last = cells[cells.length - 1]!.date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
  }

  return (
    <div className="c-month-calendar">
      <header className="c-month-calendar__header">
        <button
          type="button"
          className="c-month-calendar__nav"
          aria-label="Mes anterior"
          onClick={onPrevMonth}
        >
          <TbChevronLeft aria-hidden="true" />
        </button>
        <h2 className="c-month-calendar__title">{formatMonthTitle(cursor)}</h2>
        <button
          type="button"
          className="c-month-calendar__nav"
          aria-label="Mes siguiente"
          onClick={onNextMonth}
        >
          <TbChevronRight aria-hidden="true" />
        </button>
      </header>

      <div className="c-month-calendar__weekdays" aria-hidden="true">
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="c-month-calendar__grid" role="grid">
        {cells.map(({ date, outside }) => {
          const key = dayKey(date);
          const isToday = isSameDay(date, today);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const hasDose = doseDays.has(key);
          const hasAppointment = appointmentDays.has(key);
          const isMarked = hasDose || hasAppointment;
          const className = [
            'c-month-calendar__cell',
            outside ? 'is-outside' : null,
            isToday ? 'is-today' : null,
            isSelected ? 'is-selected' : null,
            isMarked ? 'is-marked' : null,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-pressed={isSelected}
              aria-label={formatDayLabel(date)}
              className={className}
              onClick={() => onSelect(date)}
            >
              <span>{date.getDate()}</span>
              {isMarked ? (
                <span className="c-month-calendar__markers" aria-hidden="true">
                  {hasDose ? <span className="c-month-calendar__dot c-month-calendar__dot--dose" /> : null}
                  {hasAppointment ? <span className="c-month-calendar__dot c-month-calendar__dot--appointment" /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="c-month-calendar__legend" aria-label="Leyenda del calendario">
        <span><i className="c-month-calendar__dot c-month-calendar__dot--dose" aria-hidden="true" /> Toma</span>
        <span><i className="c-month-calendar__dot c-month-calendar__dot--appointment" aria-hidden="true" /> Cita médica</span>
      </div>
    </div>
  );
}

function CalendarPage() {
  usePageTitle('Calendario');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const activeRole = useBlisterStore((state) => state.activeRole);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const addToast = useUiStore((state) => state.addToast);
  const {
    appointments,
    isLoading,
    error,
    refetch,
    removeAppointment,
    addAppointmentComment,
    updateAppointmentComment,
    removeAppointmentComment,
  } = useAppointments(blisterId);
  const { treatments } = useTreatments(blisterId);
  const { logDoseInBlister, undoLogInBlister } = useAdherence(blisterId);
  const doseMenuRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<CalendarView>('appointments');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [calendarDoses, setCalendarDoses] = useState<UpcomingDose[]>([]);
  const [monthDoseMarkers, setMonthDoseMarkers] = useState<UpcomingDose[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [skippingDoseKey, setSkippingDoseKey] = useState<string | null>(null);
  const [skipDoseCandidate, setSkipDoseCandidate] = useState<UpcomingDose | null>(null);
  const [openDoseMenuKey, setOpenDoseMenuKey] = useState<string | null>(null);
  const [expiredUndoIds, setExpiredUndoIds] = useState<Set<string>>(() => new Set());
  const [undoNow, setUndoNow] = useState(() => Date.now());
  const [upcomingVisibleCount, setUpcomingVisibleCount] = useState(CALENDAR_INITIAL_VISIBLE_ITEMS);
  const [pastVisibleCount, setPastVisibleCount] = useState(CALENDAR_INITIAL_VISIBLE_ITEMS);
  const [doseVisibleDays, setDoseVisibleDays] = useState(CALENDAR_INITIAL_VISIBLE_ITEMS);

  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const routeRole = useMemo(
    () => currentBlister?.members.find((member) => member.userId === userId)?.role ?? null,
    [currentBlister, userId],
  );
  const role = routeRole ?? (blisterId === activeBlisterId ? activeRole : null);
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';

  const refreshCalendarDoses = useCallback(async () => {
    if (!blisterId) {
      setCalendarDoses([]);
      return;
    }

    const from = startOfToday();
    const to = addDays(from, doseVisibleDays);
    setCalendarLoading(true);
    setCalendarError(null);

    try {
      const payload = await getCalendar({ from, to, blisterId, kinds: ['doses'], includeTaken: true });
      setCalendarDoses(payload.doses);
    } catch (err) {
      setCalendarError(isApiError(err) ? err.message : 'No se ha podido cargar el pastillero.');
    } finally {
      setCalendarLoading(false);
    }
  }, [blisterId, doseVisibleDays]);

  const refreshMonthDoseMarkers = useCallback(async () => {
    if (!blisterId) {
      setMonthDoseMarkers([]);
      return;
    }

    const today = startOfToday();
    const from = cursor < today ? today : startOfMonth(cursor);
    const to = startOfNextMonth(cursor);

    if (from >= to) {
      setMonthDoseMarkers([]);
      return;
    }

    try {
      const payload = await getCalendar({ from, to, blisterId, kinds: ['doses'], includeTaken: true });
      setMonthDoseMarkers(payload.doses);
    } catch {
      setMonthDoseMarkers([]);
    }
  }, [blisterId, cursor]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCalendarDoses();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshCalendarDoses]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshMonthDoseMarkers();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshMonthDoseMarkers]);

  useEffect(() => {
    if (!openDoseMenuKey) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!doseMenuRef.current?.contains(event.target as Node)) {
        setOpenDoseMenuKey(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openDoseMenuKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setUndoNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const appointmentDays = useMemo(() => {
    const today = startOfToday();
    const days = new Set<string>();

    for (const appointment of appointments) {
      const date = new Date(appointment.date);
      if (date >= today) {
        days.add(dayKey(date));
      }
    }

    return days;
  }, [appointments]);

  const doseDays = useMemo(() => {
    const days = new Set<string>();
    for (const dose of monthDoseMarkers) {
      days.add(dayKey(new Date(dose.doseAt)));
    }
    return days;
  }, [monthDoseMarkers]);

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    return {
      upcomingAppointments: appointments
        .filter((appointment) => new Date(appointment.date).getTime() >= now.getTime())
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
      pastAppointments: appointments
        .filter((appointment) => new Date(appointment.date).getTime() < now.getTime())
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    };
  }, [appointments]);

  const filteredUpcomingAppointments = useMemo(
    () => selected
      ? upcomingAppointments.filter((appointment) => isSameDay(new Date(appointment.date), selected))
      : upcomingAppointments,
    [selected, upcomingAppointments],
  );

  const visibleUpcomingAppointments = useMemo(
    () => filteredUpcomingAppointments.slice(0, upcomingVisibleCount),
    [filteredUpcomingAppointments, upcomingVisibleCount],
  );
  const visiblePastAppointments = useMemo(
    () => pastAppointments.slice(0, pastVisibleCount),
    [pastAppointments, pastVisibleCount],
  );
  const groupedUpcomingAppointments = useMemo(
    () => groupAppointmentsByDay(visibleUpcomingAppointments),
    [visibleUpcomingAppointments],
  );

  const doseWindowDays = useMemo(
    () => buildWindowDays(startOfToday(), doseVisibleDays),
    [doseVisibleDays],
  );

  const expireUndo = useCallback((logId: string): void => {
    setExpiredUndoIds((current) => new Set(current).add(logId));
  }, []);

  if (!blisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  if (!blistersLoaded && blisters.length === 0) {
    return (
      <section className="c-calendar-page" aria-busy="true">
        <Skeleton height="3rem" />
        <Skeleton height="18rem" />
      </section>
    );
  }

  const handleDelete = async (appointment: Appointment): Promise<void> => {
    try {
      await removeAppointment(appointment.id);
      addToast({ message: 'Cita eliminada.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar la cita.',
        variant: 'error',
      });
    }
  };

  const handleAddComment = async (appointment: Appointment, text: string): Promise<void> => {
    try {
      await addAppointmentComment(appointment.id, { text });
      addToast({ message: 'Comentario añadido.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido añadir el comentario.',
        variant: 'error',
      });
    }
  };

  const handleUpdateComment = async (
    appointment: Appointment,
    comment: Appointment['comments'][number],
    text: string,
  ): Promise<void> => {
    try {
      await updateAppointmentComment(appointment.id, comment.id, { text });
      addToast({ message: 'Comentario actualizado.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido actualizar el comentario.',
        variant: 'error',
      });
    }
  };

  const handleDeleteComment = async (
    appointment: Appointment,
    comment: Appointment['comments'][number],
  ): Promise<void> => {
    try {
      await removeAppointmentComment(appointment.id, comment.id);
      addToast({ message: 'Comentario eliminado.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar el comentario.',
        variant: 'error',
      });
    }
  };

  const handleLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = getDoseKey(dose);
    setLoggingDoseKey(key);

    try {
      await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        amount: dose.amount,
        timestamp: new Date(dose.doseAt),
      });
      await Promise.all([refreshCalendarDoses(), refreshMonthDoseMarkers()]);
      addToast({ message: 'Toma marcada como tomada.', variant: 'success' });
    } catch (err) {
      const message = isStockInsufficientError(err)
        ? 'No hay stock suficiente para registrar esta toma.'
        : isApiError(err)
          ? err.message
          : 'No se ha podido registrar la toma.';
      addToast({ message, variant: 'error' });
    } finally {
      setLoggingDoseKey(null);
    }
  };

  const handleSkipDose = async (dose: UpcomingDose): Promise<void> => {
    const key = getDoseKey(dose);
    setSkippingDoseKey(key);

    try {
      await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        status: 'skipped',
        timestamp: new Date(dose.doseAt),
        notes: 'Toma omitida desde Pastillero.',
      });
      setSkipDoseCandidate(null);
      await Promise.all([refreshCalendarDoses(), refreshMonthDoseMarkers()]);
      addToast({ message: 'Toma marcada como omitida.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido omitir la toma.',
        variant: 'error',
      });
    } finally {
      setSkippingDoseKey(null);
    }
  };

  const handleUndoDose = async (dose: UpcomingDose): Promise<void> => {
    if (!dose.adherenceLogId) return;

    try {
      await undoLogInBlister(dose.blisterId, dose.adherenceLogId);
      await Promise.all([refreshCalendarDoses(), refreshMonthDoseMarkers()]);
      addToast({ message: 'Toma deshecha.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido deshacer la toma.',
        variant: 'error',
      });
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <li key={appointment.id} className="c-calendar-page__item">
      <AppointmentCard
        appointment={appointment}
        treatments={treatments}
        blisterId={blisterId}
        userRole={role}
        currentUserId={userId}
        onDelete={(item) => setConfirmDelete(item)}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
      />
    </li>
  );

  return (
    <section className="c-calendar-page" aria-label="Calendario">
      <div className="c-calendar-page__tabs" role="tablist" aria-label="Vistas del calendario">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'pillbox'}
          className={`c-calendar-page__tab${view === 'pillbox' ? ' is-active' : ''}`}
          onClick={() => setView('pillbox')}
        >
          <TbPill aria-hidden="true" />
          <span>Pastillero</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'appointments'}
          className={`c-calendar-page__tab${view === 'appointments' ? ' is-active' : ''}`}
          onClick={() => setView('appointments')}
        >
          <TbCalendar aria-hidden="true" />
          <span>Citas médicas</span>
        </button>
      </div>

      {view === 'appointments' ? (
        <>
          <MonthCalendar
            cursor={cursor}
            selected={selected}
            doseDays={doseDays}
            appointmentDays={appointmentDays}
            onSelect={(date) => {
              const selectedDay = startOfDay(date);
              setSelected((current) => (current && isSameDay(current, selectedDay) ? null : selectedDay));
              setUpcomingVisibleCount(CALENDAR_INITIAL_VISIBLE_ITEMS);
              setCursor(date);
            }}
            onPrevMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            onNextMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          />

          {error ? (
            <ErrorState message={error} onRetry={() => void refetch()} />
          ) : isLoading ? (
            <Skeleton height="5rem" />
          ) : (
            <div className="c-calendar-page__appointment-sections">
              <section className="c-calendar-page__day" aria-labelledby="upcoming-appointments-title">
                <div className="c-calendar-page__section-heading">
                  <h3 id="upcoming-appointments-title" className="c-calendar-page__day-title">
                    Próximas citas
                  </h3>
                  {selected ? (
                    <Link
                      to={ROUTES.blisterAppointments(blisterId)}
                      replace
                      className="c-calendar-page__clear-filter"
                      onClick={() => {
                        setSelected(null);
                        setUpcomingVisibleCount(CALENDAR_INITIAL_VISIBLE_ITEMS);
                      }}
                    >
                      Ver todas
                    </Link>
                  ) : null}
                </div>
                {filteredUpcomingAppointments.length === 0 ? (
                  <EmptyState
                    title="Sin citas próximas"
                    description={
                      canMutate
                        ? 'Añade una cita nueva o revisa otro día del calendario.'
                        : 'Selecciona otro día del calendario para revisar la agenda.'
                    }
                  />
                ) : (
                  <div className="c-calendar-page__groups">
                    {groupedUpcomingAppointments.map((group) => (
                      <section key={group.key} className="c-calendar-page__group" aria-labelledby={`appointments-${group.key}`}>
                        <h4 id={`appointments-${group.key}`} className="c-calendar-page__group-title">
                          {formatDayLabel(group.day)}
                        </h4>
                        <ul className="c-calendar-page__list">
                          {group.appointments.map(renderAppointmentCard)}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}

                {filteredUpcomingAppointments.length > upcomingVisibleCount ? (
                  <Button
                    type="button"
                    variant="primary-outline"
                    fullWidth
                    onClick={() => setUpcomingVisibleCount((count) => count + CALENDAR_SHOW_MORE_INCREMENT)}
                  >
                    Mostrar más
                  </Button>
                ) : null}
              </section>

              <section className="c-calendar-page__day" aria-labelledby="past-appointments-title">
                <h3 id="past-appointments-title" className="c-calendar-page__day-title">Citas pasadas</h3>
                {pastAppointments.length === 0 ? (
                  <EmptyState title="Sin citas pasadas" description="Las citas anteriores aparecerán aquí." />
                ) : (
                  <ul className="c-calendar-page__list">
                    {visiblePastAppointments.map(renderAppointmentCard)}
                  </ul>
                )}

                {pastAppointments.length > pastVisibleCount ? (
                  <Button
                    type="button"
                    variant="primary-outline"
                    fullWidth
                    onClick={() => setPastVisibleCount((count) => count + CALENDAR_SHOW_MORE_INCREMENT)}
                  >
                    Mostrar más
                  </Button>
                ) : null}
              </section>
            </div>
          )}

          {canMutate ? (
            <button
              type="button"
              className="c-calendar-page__fab"
              aria-label="Nueva cita"
              onClick={() => navigate(ROUTES.newAppointment(blisterId))}
            >
              <TbPlus aria-hidden="true" />
            </button>
          ) : null}
        </>
      ) : (
        <div className="c-calendar-page__pillbox">
          <h3 className="c-calendar-page__day-title">Próximos {doseVisibleDays} días</h3>
          {calendarError ? (
            <ErrorState message={calendarError} onRetry={() => void refreshCalendarDoses()} />
          ) : calendarLoading ? (
            <Skeleton height="5rem" />
          ) : calendarDoses.length === 0 ? (
            <EmptyState
              title="Sin tomas programadas"
              description="Añade tratamientos activos o muestra más días para ver aquí su agenda."
            />
          ) : (
            <div className="c-calendar-page__groups">
              {doseWindowDays.map((day) => {
                const items = calendarDoses
                  .filter((dose) => isSameDay(new Date(dose.doseAt), day))
                  .sort((left, right) => new Date(left.doseAt).getTime() - new Date(right.doseAt).getTime());

                if (items.length === 0) {
                  return null;
                }

                return (
                  <section key={dayKey(day)} className="c-calendar-page__group" aria-labelledby={`doses-${dayKey(day)}`}>
                    <h4 id={`doses-${dayKey(day)}`} className="c-calendar-page__group-title">
                      {formatDayLabel(day)}
                    </h4>
                    <ul className="c-calendar-page__doses">
                      {items.map((dose) => {
                        const time = new Date(dose.doseAt);
                        const doseKey = getDoseKey(dose);
                        const logged = dose.isTaken || dose.isSkipped;
                        const createdAt = dose.adherenceCreatedAt ? Date.parse(dose.adherenceCreatedAt) : null;
                        const canUndoDose = Boolean(
                          dose.adherenceLogId &&
                          createdAt &&
                          Number.isFinite(createdAt) &&
                          undoNow - createdAt < ADHERENCE_UNDO_WINDOW_MS &&
                          !expiredUndoIds.has(dose.adherenceLogId),
                        );

                        return (
                          <li key={doseKey} className={`c-dose-row${dose.isTaken ? ' c-dose-row--taken' : ''}${dose.isSkipped ? ' c-dose-row--skipped' : ''}`}>
                            <time className="c-dose-row__time" dateTime={time.toISOString()}>
                              {timeFormatter.format(time)}
                            </time>
                            <div className="c-dose-row__body">
                              <header className="c-dose-row__header">
                                <div className="c-dose-row__heading">
                                  <p className="c-dose-row__title">{dose.medicineName}</p>
                                  <p className="c-dose-row__meta">
                                    {dose.amount} unidad(es) · {dose.treatmentTitle} · {dose.blisterName}
                                  </p>
                                </div>
                                <span title={dose.patientName || dose.blisterName}>
                                  <Avatar
                                    name={dose.patientName || dose.blisterName}
                                    avatarKey={dose.patientAvatarKey ?? undefined}
                                    size="sm"
                                  />
                                </span>
                              </header>
                              {logged ? (
                                <div className="c-dose-row__actions">
                                  <span className={`c-dose-row__status c-dose-row__status--${dose.isSkipped ? 'skipped' : 'taken'}`}>
                                    {dose.isSkipped ? 'Omitida' : 'Tomada'}
                                  </span>
                                  {canUndoDose && dose.adherenceLogId && createdAt ? (
                                    <DoseUndoButton
                                      logId={dose.adherenceLogId}
                                      createdAt={createdAt}
                                      onUndo={() => void handleUndoDose(dose)}
                                      onExpire={expireUndo}
                                    />
                                  ) : null}
                                </div>
                              ) : dose.callerRole === 'OWNER' || dose.callerRole === 'CAREGIVER' ? (
                                <div className="c-dose-row__actions">
                                  <button
                                    type="button"
                                    className="c-dose-row__btn c-dose-row__btn--solid"
                                    disabled={loggingDoseKey === doseKey}
                                    onClick={() => void handleLogDose(dose)}
                                  >
                                    <TbCheck aria-hidden="true" />
                                    <span>
                                      {loggingDoseKey === doseKey
                                        ? 'Marcando...'
                                        : 'Marcar toma'}
                                    </span>
                                  </button>
                                  <div
                                    className="c-action-menu c-dose-row__action-menu"
                                    ref={openDoseMenuKey === doseKey ? doseMenuRef : undefined}
                                  >
                                    <ActionMenuButton
                                      className="c-dose-row__menu-toggle"
                                      label="Acciones de la toma"
                                      aria-haspopup="menu"
                                      aria-expanded={openDoseMenuKey === doseKey}
                                      onClick={() => setOpenDoseMenuKey((current) => current === doseKey ? null : doseKey)}
                                    />
                                    {openDoseMenuKey === doseKey ? (
                                      <div className="c-action-menu__popover c-dose-row__menu-popover" role="menu">
                                        <button
                                          type="button"
                                          className="c-action-menu__item"
                                          role="menuitem"
                                          onClick={() => {
                                            setOpenDoseMenuKey(null);
                                            navigate(ROUTES.treatmentDetail(dose.blisterId, dose.treatmentId));
                                          }}
                                        >
                                          Ver tratamiento
                                        </button>
                                        <button
                                          type="button"
                                          className="c-action-menu__item"
                                          role="menuitem"
                                          disabled={skippingDoseKey === doseKey}
                                          onClick={() => {
                                            setOpenDoseMenuKey(null);
                                            setSkipDoseCandidate(dose);
                                          }}
                                        >
                                          {skippingDoseKey === doseKey ? 'Omitiendo...' : 'Omitir'}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="primary-outline"
            fullWidth
            onClick={() => setDoseVisibleDays((days) => days + CALENDAR_SHOW_MORE_INCREMENT)}
          >
            Mostrar más
          </Button>
        </div>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          message={`¿Eliminar la cita "${confirmDelete.title}"?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            await handleDelete(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      ) : null}

      {skipDoseCandidate ? (
        <ConfirmDialog
          message="¿Seguro que quieres omitir esta toma? Quedará registrada como omitida y no se descontará stock."
          cancelLabel="Cancelar"
          confirmLabel="Omitir toma"
          onCancel={() => setSkipDoseCandidate(null)}
          onConfirm={async () => {
            await handleSkipDose(skipDoseCandidate);
          }}
        />
      ) : null}
    </section>
  );
}

interface ConfirmDialogProps {
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  cancelLabel?: string;
  confirmLabel?: string;
}

function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
  cancelLabel = 'Conservar',
  confirmLabel = 'Sí, eliminar',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="c-modal" role="dialog" aria-modal="true">
      <div className="c-modal__backdrop" onClick={onCancel} />
      <div className="c-modal__panel">
        <div className="c-modal__body">
          <p className="c-confirm-modal__message">{message}</p>
          <div className="c-confirm-modal__actions">
            <Button type="button" variant="primary-outline" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
