import { Link } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import type { Appointment } from '../../types/appointment.types';
import type { BlisterRole } from '../../types/blister.types';
import type { Treatment } from '../../types/treatment.types';
import { Button } from '../atoms/Button';

interface AppointmentCardProps {
  appointment: Appointment;
  treatments: Treatment[];
  blisterId: string;
  userRole: BlisterRole | null;
  onDelete: (appointment: Appointment) => void;
}

const canMutate = (role: BlisterRole | null): boolean =>
  role === 'OWNER' || role === 'CAREGIVER';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Tarjeta de cita con título, fecha y tratamiento vinculado opcional. */
export function AppointmentCard({
  appointment,
  treatments,
  blisterId,
  userRole,
  onDelete,
}: AppointmentCardProps) {
  const editable = canMutate(userRole);
  const linkedTreatment = appointment.treatmentId
    ? treatments.find((t) => t.id === appointment.treatmentId)
    : null;
  const formattedDate = dateFormatter.format(new Date(appointment.date));

  return (
    <article className="c-appointment-card" aria-label={appointment.title}>
      <header className="c-appointment-card__header">
        <h3 className="c-appointment-card__title">{appointment.title}</h3>
        <time className="c-appointment-card__date" dateTime={appointment.date}>
          {formattedDate}
        </time>
      </header>
      {linkedTreatment ? (
        <p className="c-appointment-card__treatment">
          Vinculada a <strong>{linkedTreatment.title}</strong>
        </p>
      ) : null}
      {editable ? (
        <footer className="c-appointment-card__actions">
          <Link to={ROUTES.editAppointment(blisterId, appointment.id)} className="c-appointment-card__edit-link">
            <Button variant="primary-outline">Editar</Button>
          </Link>
          <Button variant="danger" onClick={() => onDelete(appointment)}>
            Eliminar
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
