import { Link } from 'react-router-dom';
import {
  TbBuildingHospital,
  TbChevronRight,
  TbPill,
  TbUser,
} from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import type { Treatment } from '../../types/treatment.types';

interface TreatmentRowProps {
  treatment: Treatment;
  blisterId: string;
  patientName: string;
  patientAvatarKey?: string | null;
  appointmentsCount: number;
}

const MS_PER_DAY = 86_400_000;

const treatmentDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso: string): string {
  return treatmentDateFormatter.format(new Date(iso));
}

function getProgress(treatment: Treatment): { percent: number; label: string; range: string } {
  const start = new Date(treatment.startDate).getTime();
  const end = treatment.endDate ? new Date(treatment.endDate).getTime() : start;
  const now = Date.now();
  const range = treatment.endDate
    ? `${formatDate(treatment.startDate)} – ${formatDate(treatment.endDate)}`
    : `Desde ${formatDate(treatment.startDate)}`;

  if (!treatment.endDate || end <= start) {
    return { percent: treatment.active ? 100 : 0, label: treatment.active ? 'En curso' : 'Archivado', range };
  }

  const totalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
  const currentDay = Math.min(totalDays, Math.max(1, Math.ceil((now - start) / MS_PER_DAY)));
  const percent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  return { percent, label: `Día ${currentDay} de ${totalDays}`, range };
}

/** Card resumen de tratamiento con progreso y acciones principales. */
export function TreatmentRow({
  treatment,
  blisterId,
  patientName,
  patientAvatarKey,
  appointmentsCount,
}: TreatmentRowProps) {
  const progress = getProgress(treatment);
  const medicineCount = treatment.medicines.length;

  return (
    <article className="c-treatment-row" aria-label={treatment.title}>
      <header className="c-treatment-row__header">
        <Avatar name={patientName || treatment.title} avatarKey={patientAvatarKey ?? undefined} size="md" />
        <div className="c-treatment-row__heading">
          <h3 className="c-treatment-row__title">{treatment.title}</h3>
          <p className="c-treatment-row__patient">
            <TbUser aria-hidden="true" />
            {patientName || 'Paciente'}
          </p>
        </div>
      </header>

      <Link
        to={ROUTES.treatmentDetail(blisterId, treatment.id)}
        className="c-treatment-row__summary-link"
        aria-label={`Ver tratamiento ${treatment.title}`}
      >
        <span className="c-treatment-row__meta-stack">
          <span className="c-treatment-row__meta">
            <TbPill aria-hidden="true" />
            {medicineCount} medicamento{medicineCount === 1 ? '' : 's'} pautado{medicineCount === 1 ? '' : 's'}.
          </span>
          <span className="c-treatment-row__meta">
            <TbBuildingHospital aria-hidden="true" />
            {appointmentsCount} cita{appointmentsCount === 1 ? '' : 's'} médica{appointmentsCount === 1 ? '' : 's'}.
          </span>
        </span>
        <TbChevronRight className="c-treatment-row__summary-icon" aria-hidden="true" />
      </Link>

      <div className="c-treatment-row__progress" aria-label={`Progreso del tratamiento: ${progress.label}`}>
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="c-treatment-row__range">
        <span>{progress.range}</span>
        <span>{progress.label}</span>
      </p>
    </article>
  );
}
