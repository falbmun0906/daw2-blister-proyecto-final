import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  TbCalendar,
  TbChevronLeft,
  TbChevronRight,
  TbPill,
  TbPlus,
} from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { AppointmentCard } from '../../components/organisms/AppointmentCard';
import { ROUTES } from '../../constants/routes';
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
import './CalendarPage.scss';

type CalendarView = 'pillbox' | 'appointments';

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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
  markedDays: Set<string>;
  onSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/** Cuadrícula mensual con casillas marcadas para días con citas. */
function MonthCalendar({ cursor, selected, markedDays, onSelect, onPrevMonth, onNextMonth }: MonthCalendarProps) {
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
          const isMarked = markedDays.has(key);
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
              {isMarked ? <span className="c-month-calendar__dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
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
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const addToast = useUiStore((s) => s.addToast);
  const { appointments, isLoading, error, refetch, removeAppointment } = useAppointments(blisterId);
  const { treatments } = useTreatments(blisterId);

  const [view, setView] = useState<CalendarView>('appointments');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [calendarDoses, setCalendarDoses] = useState<UpcomingDose[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

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

  useEffect(() => {
    if (!blisterId) return;
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    setCalendarLoading(true);
    setCalendarError(null);
    getCalendar({ from, to, blisterId, kinds: ['doses'] })
      .then((payload) => setCalendarDoses(payload.doses))
      .catch((err: unknown) => {
        setCalendarError(isApiError(err) ? err.message : 'No se ha podido cargar el pastillero.');
      })
      .finally(() => setCalendarLoading(false));
  }, [blisterId, cursor]);

  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(dayKey(new Date(a.date)));
    for (const dose of calendarDoses) set.add(dayKey(new Date(dose.doseAt)));
    return set;
  }, [appointments, calendarDoses]);

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.date), selected))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, selected]);

  const dayDoses = useMemo(() => {
    return calendarDoses
      .filter((dose) => isSameDay(new Date(dose.doseAt), selected))
      .sort((a, b) => new Date(a.doseAt).getTime() - new Date(b.doseAt).getTime());
  }, [calendarDoses, selected]);

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
            markedDays={markedDays}
            onSelect={(date) => {
              setSelected(date);
              setCursor(date);
            }}
            onPrevMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            onNextMonth={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          />

          <div className="c-calendar-page__day">
            <h3 className="c-calendar-page__day-title">{longDateFormatter.format(selected)}</h3>
            {error ? (
              <ErrorState message={error} onRetry={() => void refetch()} />
            ) : isLoading ? (
              <Skeleton height="5rem" />
            ) : dayAppointments.length === 0 ? (
              <EmptyState
                title="Sin citas para este día"
                description={
                  canMutate
                    ? 'Selecciona otro día o añade una cita nueva.'
                    : 'Selecciona otro día.'
                }
              />
            ) : (
              <ul className="c-calendar-page__list">
                {dayAppointments.map((appointment) => (
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
            )}
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
          <h3 className="c-calendar-page__day-title">{longDateFormatter.format(selected)}</h3>
          {calendarError ? (
            <ErrorState message={calendarError} onRetry={() => setCursor(new Date(cursor))} />
          ) : calendarLoading ? (
            <Skeleton height="5rem" />
          ) : dayDoses.length === 0 ? (
            <EmptyState
              title="Sin tomas programadas"
              description="Selecciona otro día o añade tratamientos activos para ver aquí su agenda."
            />
          ) : (
            <ul className="c-calendar-page__doses">
              {dayDoses.map((dose) => {
                const time = new Date(dose.doseAt);
                return (
                  <li key={`${dose.treatmentId}-${dose.medicineId}-${dose.doseAt}`} className="c-dose-row">
                    <time className="c-dose-row__time" dateTime={time.toISOString()}>
                      {timeFormatter.format(time)}
                    </time>
                    <div className="c-dose-row__body">
                      <p className="c-dose-row__title">{dose.medicineName}</p>
                      <p className="c-dose-row__meta">{dose.amount} unidad(es) · {dose.treatmentTitle}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
