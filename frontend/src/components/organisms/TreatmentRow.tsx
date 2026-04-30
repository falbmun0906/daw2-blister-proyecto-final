import { Link } from 'react-router-dom';
import { TbBuildingHospital, TbPill, TbUser } from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import type { BlisterRole } from '../../types/blister.types';
import type { Medicine } from '../../types/medicine.types';
import type { Treatment } from '../../types/treatment.types';
import { Button } from '../atoms/Button';

interface TreatmentRowProps {
  treatment: Treatment;
  medicines: Medicine[];
  blisterId: string;
  userRole: BlisterRole | null;
  onDelete: (treatment: Treatment) => void;
  onLogDose?: (treatmentId: string, medicineId: string) => void;
}

const canMutate = (role: BlisterRole | null): boolean =>
  role === 'OWNER' || role === 'CAREGIVER';

const MS_PER_DAY = 86_400_000;

function resolveMedicineName(medicines: Medicine[], medicineId: string): string {
  const medicine = medicines.find((m) => m._id === medicineId);
  if (!medicine) return 'Medicamento';
  return medicine.alias?.trim() || medicine.nombre;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
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

/** Fila de tratamiento con título, medicamentos vinculados y acciones por rol. */
export function TreatmentRow({ treatment, medicines, blisterId, userRole, onDelete, onLogDose }: TreatmentRowProps) {
  const editable = canMutate(userRole);
  const progress = getProgress(treatment);

  return (
    <article className="c-treatment-row" aria-label={treatment.title}>
      <header className="c-treatment-row__header">
        <span className="c-treatment-row__icon" aria-hidden="true">
          <TbBuildingHospital />
        </span>
        <div className="c-treatment-row__heading">
          <h3 className="c-treatment-row__title">{treatment.title}</h3>
          <p className="c-treatment-row__meta">
            <TbUser aria-hidden="true" /> Paciente asignado
          </p>
          <p className="c-treatment-row__meta">
            <TbPill aria-hidden="true" /> {treatment.medicines.length} medicamento{treatment.medicines.length === 1 ? '' : 's'}
          </p>
        </div>
        <span className={`c-treatment-row__status c-treatment-row__status--${treatment.active ? 'active' : 'archived'}`}>
          {treatment.active ? 'Activo' : 'Archivado'}
        </span>
      </header>

      <div className="c-treatment-row__progress" aria-label={`Progreso del tratamiento: ${progress.label}`}>
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="c-treatment-row__range">
        <span>{progress.range}</span>
        <span>{progress.label}</span>
      </p>

      <ul className="c-treatment-row__meds">
        {treatment.medicines.map((entry) => (
          <li key={entry.medicineId} className="c-treatment-row__med">
            <span className="c-treatment-row__med-name">
              {resolveMedicineName(medicines, entry.medicineId)}
            </span>
            <span className="c-treatment-row__med-dose">
              {entry.amount} · cada {entry.frequencyHours} h
            </span>
            {treatment.active && onLogDose && editable ? (
              <Button
                variant="primary-outline"
                onClick={() => onLogDose(treatment.id, entry.medicineId)}
              >
                Registrar toma
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {editable ? (
        <footer className="c-treatment-row__actions">
          <Link to={ROUTES.editTreatment(blisterId, treatment.id)} className="c-treatment-row__edit-link">
            <Button variant="primary-outline">Editar</Button>
          </Link>
          <Button variant="danger" onClick={() => onDelete(treatment)}>
            Eliminar
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
