import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Appointment } from '../../types/appointment.types';
import type { Treatment } from '../../types/treatment.types';
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

interface DoseSlot {
  treatmentId: string;
  treatmentTitle: string;
  hour: number;
  minute: number;
  amount: number;
}

/** Genera slots horarios placeholder para la vista pastillero. */
function buildDoseSlots(treatments: Treatment[]): DoseSlot[] {
  const slots: DoseSlot[] = [];
  for (const t of treatments) {
    if (t.active === false) continue;
    for (const m of t.medicines) {
      const freq = Math.max(1, m.frequencyHours || 24);
      const dosesPerDay = Math.max(1, Math.floor(24 / freq));
      for (let i = 0; i < dosesPerDay; i += 1) {
        const hour = (8 + i * freq) % 24;
        slots.push({
          treatmentId: t.id,
          treatmentTitle: t.title,
          hour,
          minute: 0,
          amount: m.amount,
        });
      }
    }
  }
  return slots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

function CalendarPage() {
  usePageTitle('Calendario');
  const navigate = useNavigate();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const addToast = useUiStore((s) => s.addToast);
  const { appointments, isLoading, error, refetch, removeAppointment } = useAppointments();
  const { treatments } = useTreatments();

  const [view, setView] = useState<CalendarView>('appointments');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);

  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';

  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(dayKey(new Date(a.date)));
    return set;
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.date), selected))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, selected]);

  const doseSlots = useMemo(() => buildDoseSlots(treatments), [treatments]);

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
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
                      blisterId={activeBlisterId}
                      userRole={activeRole}
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
              onClick={() => navigate(ROUTES.newAppointment(activeBlisterId))}
            >
              <TbPlus aria-hidden="true" />
            </button>
          ) : null}
        </>
      ) : (
        <div className="c-calendar-page__pillbox">
          <h3 className="c-calendar-page__day-title">{longDateFormatter.format(new Date())}</h3>
          {doseSlots.length === 0 ? (
            <EmptyState
              title="Sin tomas programadas"
              description="Añade tratamientos activos para ver aquí su agenda diaria."
            />
          ) : (
            <ul className="c-calendar-page__doses">
              {doseSlots.map((slot, idx) => {
                const time = new Date();
                time.setHours(slot.hour, slot.minute, 0, 0);
                return (
                  <li key={`${slot.treatmentId}-${idx}`} className="c-dose-row">
                    <time className="c-dose-row__time" dateTime={time.toISOString()}>
                      {timeFormatter.format(time)}
                    </time>
                    <div className="c-dose-row__body">
                      <p className="c-dose-row__title">{slot.treatmentTitle}</p>
                      <p className="c-dose-row__meta">{slot.amount} unidad(es)</p>
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
