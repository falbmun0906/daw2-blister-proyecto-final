import { Link } from 'react-router-dom';

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

function resolveMedicineName(medicines: Medicine[], medicineId: string): string {
  const medicine = medicines.find((m) => m._id === medicineId);
  if (!medicine) return 'Medicamento';
  return medicine.alias?.trim() || medicine.nombre;
}

/** Fila de tratamiento con título, medicamentos vinculados y acciones por rol. */
export function TreatmentRow({ treatment, medicines, blisterId, userRole, onDelete, onLogDose }: TreatmentRowProps) {
  const editable = canMutate(userRole);

  return (
    <article className="c-treatment-row" aria-label={treatment.title}>
      <header className="c-treatment-row__header">
        <h3 className="c-treatment-row__title">{treatment.title}</h3>
        <span className={`c-treatment-row__status c-treatment-row__status--${treatment.active ? 'active' : 'archived'}`}>
          {treatment.active ? 'Activo' : 'Archivado'}
        </span>
      </header>
      <ul className="c-treatment-row__meds">
        {treatment.medicines.map((entry) => (
          <li key={entry.medicineId} className="c-treatment-row__med">
            <span className="c-treatment-row__med-name">
              {resolveMedicineName(medicines, entry.medicineId)}
            </span>
            <span className="c-treatment-row__med-dose">
              {entry.amount} · cada {entry.frequency} h
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
