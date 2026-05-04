import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  TbCalendar,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbPill,
  TbPlus,
} from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { AppointmentCard } from '../../components/organisms/AppointmentCard';
import { ROUTES } from '../../constants/routes';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useAppointments } from '../../hooks/use.appointments';
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { scheduleAppointmentNotifications } from '../../lib/push-notifications';
import { getCalendar, type UpcomingDose } from '../../services/me.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Appointment } from '../../types/appointment.types';
import './CalendarPage.scss';

type CalendarView = 'pillbox' | 'appointments';

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfToday = (): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const isWithinWindow = (date: Date, from: Date, to: Date): boolean =>
  date >= from && date < to;

const buildWindowDays = (visibleDays: number): Date[] => {
  const start = startOfToday();
  return Array.from({ length: visibleDays }, (_, index) => addDays(start, index));
};

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

interface MonthCalendarProps {
  cursor: Date;
  selected: Date;
  doseDays: Set<string>;
  appointmentDays: Set<string>;
  onSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/** Cuadrícula mensual con casillas marcadas para días con citas. */
function MonthCalendar({ cursor, selected, doseDays, appointmentDays, onSelect, onPrevMonth, onNextMonth }: MonthCalendarProps) {
  const today = new Date();
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  // Lunes como primer día (0 = Lu .. 6 = Do).
  const firstWeekDay = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date; outside: boolean }> = [];
  // Días del mes anterior para completar la primera fila.
  for (let i = firstWeekDay; i > 0; i -= 1) {
    cells.push({ date: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - i), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), outside: false });
  }
  // Hasta completar 6 filas (42 celdas).
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
        <h2 className="c-month-calendar__title">{monthFormatter.format(cursor)}</h2>
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
        {WEEK_DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="c-month-calendar__grid" role="grid">
        {cells.map(({ date, outside }) => {
          const key = dayKey(date);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selected);
          const hasDose = doseDays.has(key);
          const hasAppointment = appointmentDays.has(key);
          const isMarked = hasDose || hasAppointment;
          const className = [
            'c-month-calendar__cell',
            outside && 'is-outside',
            isToday && 'is-today',
            isSelected && 'is-selected',
            isMarked && 'is-marked',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-pressed={isSelected}
              aria-label={longDateFormatter.format(date)}
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
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const userSettings = useAuthStore((s) => s.user?.settings ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const addToast = useUiStore((s) => s.addToast);
  const { appointments, isLoading, error, refetch, removeAppointment } = useAppointments(blisterId);
  const { treatments } = useTreatments(blisterId);
  const { logDoseInBlister } = useAdherence(blisterId);

  const [view, setView] = useState<CalendarView>('appointments');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [calendarDoses, setCalendarDoses] = useState<UpcomingDose[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [loggingDoseKey, setLoggingDoseKey] = useState<string | null>(null);
  const [visibleDays, setVisibleDays] = useState(3);

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
    const to = addDays(from, visibleDays);
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const payload = await getCalendar({ from, to, blisterId, kinds: ['doses'] });
      setCalendarDoses(payload.doses);
    } catch (err) {
      setCalendarError(isApiError(err) ? err.message : 'No se ha podido cargar el pastillero.');
    } finally {
      setCalendarLoading(false);
    }
  }, [blisterId, visibleDays]);

  useEffect(() => {
    void refreshCalendarDoses();
  }, [refreshCalendarDoses]);

  const appointmentDays = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(dayKey(new Date(a.date)));
    return set;
  }, [appointments]);

  const doseDays = useMemo(() => {
    const set = new Set<string>();
    for (const dose of calendarDoses) set.add(dayKey(new Date(dose.doseAt)));
    return set;
  }, [calendarDoses]);

  const windowDays = useMemo(() => buildWindowDays(visibleDays), [visibleDays]);
  const windowStart = windowDays[0] ?? startOfToday();
  const windowEnd = addDays(windowStart, visibleDays);
  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => isWithinWindow(new Date(appointment.date), windowStart, windowEnd))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  }, [appointments, windowEnd, windowStart]);

  useEffect(() => {
    scheduleAppointmentNotifications(visibleAppointments, userSettings);
  }, [userSettings, visibleAppointments]);

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

  const handleLogDose = async (dose: UpcomingDose): Promise<void> => {
    const key = `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`;
    setLoggingDoseKey(key);
    try {
      await logDoseInBlister(dose.blisterId, {
        treatmentId: dose.treatmentId,
        medicineId: dose.medicineId,
        amount: dose.amount,
        timestamp: new Date(dose.doseAt),
      });
      setCalendarDoses((prev) => prev.filter((item) => `${item.treatmentId}-${item.medicineId}-${item.doseAt}` !== key));
      addToast({ message: 'Toma marcada como tomada.', variant: 'success' });
    } catch (err) {
      const message = isStockInsufficientError(err)
        ? 'No hay stock suficiente para registrar esta toma.'
        : isApiError(err) ? err.message : 'No se ha podido registrar la toma.';
      addToast({ message, variant: 'error' });
    } finally {
      setLoggingDoseKey(null);
    }
  };

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
              setSelected(date);
              setCursor(date);
            }}
            onPrevMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            onNextMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          />

          <div className="c-calendar-page__day">
            <h3 className="c-calendar-page__day-title">Próximos {visibleDays} días</h3>
            {error ? (
              <ErrorState message={error} onRetry={() => void refetch()} />
            ) : isLoading ? (
              <Skeleton height="5rem" />
            ) : visibleAppointments.length === 0 ? (
              <EmptyState
                title="Sin citas próximas"
                description={
                  canMutate
                    ? 'Añade una cita nueva o muestra más días.'
                    : 'Puedes mostrar más días para revisar la agenda.'
                }
              />
            ) : (
              <div className="c-calendar-page__groups">
                {windowDays.map((day) => {
                  const items = visibleAppointments.filter((appointment) => isSameDay(new Date(appointment.date), day));
                  if (items.length === 0) return null;
                  return (
                    <section key={dayKey(day)} className="c-calendar-page__group" aria-labelledby={`appointments-${dayKey(day)}`}>
                      <h4 id={`appointments-${dayKey(day)}`} className="c-calendar-page__group-title">
                        {longDateFormatter.format(day)}
                      </h4>
                      <ul className="c-calendar-page__list">
                        {items.map((appointment) => (
                          <li key={appointment.id} className="c-calendar-page__item">
                            <AppointmentCard
                              appointment={appointment}
                              treatments={treatments}
                              blisterId={blisterId}
                              userRole={role}
                              onDelete={(a) => setConfirmDelete(a)}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
            <Button type="button" variant="primary-outline" fullWidth onClick={() => setVisibleDays((days) => days + 3)}>
              Mostrar más
            </Button>
          </div>

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
          <h3 className="c-calendar-page__day-title">Próximos {visibleDays} días</h3>
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
              {windowDays.map((day) => {
                const items = calendarDoses
                  .filter((dose) => isSameDay(new Date(dose.doseAt), day))
                  .sort((left, right) => new Date(left.doseAt).getTime() - new Date(right.doseAt).getTime());
                if (items.length === 0) return null;
                return (
                  <section key={dayKey(day)} className="c-calendar-page__group" aria-labelledby={`doses-${dayKey(day)}`}>
                    <h4 id={`doses-${dayKey(day)}`} className="c-calendar-page__group-title">
                      {longDateFormatter.format(day)}
                    </h4>
                    <ul className="c-calendar-page__doses">
                      {items.map((dose) => {
                        const time = new Date(dose.doseAt);
                        return (
                          <li key={`${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`} className="c-dose-row">
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
                              {(dose.callerRole === 'OWNER' || dose.callerRole === 'CAREGIVER') ? (
                                <div className="c-dose-row__actions">
                                  <button
                                    type="button"
                                    className="c-dose-row__btn c-dose-row__btn--solid"
                                    disabled={loggingDoseKey === `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`}
                                    onClick={() => void handleLogDose(dose)}
                                  >
                                    <TbCheck aria-hidden="true" />
                                    <span>{loggingDoseKey === `${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}` ? 'Marcando...' : 'Marcar toma'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="c-dose-row__btn c-dose-row__btn--ghost"
                                    onClick={() => navigate(ROUTES.editTreatment(dose.blisterId, dose.treatmentId))}
                                  >
                                    Editar dosis
                                  </button>
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
          <Button type="button" variant="primary-outline" fullWidth onClick={() => setVisibleDays((days) => days + 3)}>
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
    </section>
  );
}

interface ConfirmDialogProps {
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmDialog({ message, onCancel, onConfirm }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="c-modal" role="dialog" aria-modal="true">
      <div className="c-modal__backdrop" onClick={onCancel} />
      <div className="c-modal__panel">
        <div className="c-modal__body">
          <p className="c-confirm-modal__message">{message}</p>
          <div className="c-confirm-modal__actions">
            <Button type="button" variant="primary-outline" onClick={onCancel} disabled={busy}>
              Conservar
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
              Sí, eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
