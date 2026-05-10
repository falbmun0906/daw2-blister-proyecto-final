import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbBuildingHospital, TbDotsVertical, TbPencil, TbPill, TbTrash, TbUser } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import type { BlisterRole } from '../../types/blister.types';
import type { Medicine } from '../../types/medicine.types';
import type { Treatment } from '../../types/treatment.types';

interface TreatmentRowProps {
  treatment: Treatment;
  medicines: Medicine[];
  blisterId: string;
  blisterName: string;
  patientName: string;
  patientAvatarKey?: string | null;
  userRole: BlisterRole | null;
  onDelete: (treatment: Treatment) => void;
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

/** Card resumen de tratamiento con progreso y acciones principales. */
export function TreatmentRow({
  treatment,
  medicines,
  blisterId,
  blisterName,
  patientName,
  patientAvatarKey,
  userRole,
  onDelete,
}: TreatmentRowProps) {
  const editable = canMutate(userRole);
  const progress = getProgress(treatment);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMedicine = treatment.medicines[0]
    ? resolveMedicineName(medicines, treatment.medicines[0].medicineId)
    : null;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <article className="c-treatment-row" aria-label={treatment.title}>
      <header className="c-treatment-row__header">
        <span className="c-treatment-row__icon" aria-hidden="true">
          <TbBuildingHospital />
        </span>
        <div className="c-treatment-row__heading">
          <h3 className="c-treatment-row__title">{treatment.title}</h3>
          <p className="c-treatment-row__meta">
            <TbUser aria-hidden="true" /> {patientName || 'Paciente'}
          </p>
          <p className="c-treatment-row__meta">
            <TbPill aria-hidden="true" /> {firstMedicine ?? `${treatment.medicines.length} medicamento${treatment.medicines.length === 1 ? '' : 's'}`} · {blisterName}
          </p>
        </div>
        <Avatar name={patientName || treatment.title} avatarKey={patientAvatarKey ?? undefined} size="md" />
      </header>

      <div className="c-treatment-row__progress" aria-label={`Progreso del tratamiento: ${progress.label}`}>
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="c-treatment-row__range">
        <span>{progress.range}</span>
        <span>{progress.label}</span>
      </p>

      <footer className="c-treatment-row__actions">
        <Link
          to={ROUTES.treatmentDetail(blisterId, treatment.id)}
          className="c-btn c-btn--primary c-btn--card c-btn--full c-treatment-row__primary-link"
        >
          <span>Ver tratamiento</span>
        </Link>
        {editable ? (
          <div className="c-treatment-row__menu" ref={menuRef}>
            <button
              type="button"
              className="c-treatment-row__menu-toggle"
              aria-label="Acciones del tratamiento"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <TbDotsVertical aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="c-treatment-row__menu-popover" role="menu">
                <Link
                  to={ROUTES.editTreatment(blisterId, treatment.id)}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <TbPencil aria-hidden="true" />
                  <span>Editar</span>
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(treatment);
                  }}
                >
                  <TbTrash aria-hidden="true" />
                  <span>Eliminar</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
