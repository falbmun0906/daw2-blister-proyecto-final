import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TbBuildingHospital,
  TbChevronRight,
  TbPencil,
  TbPill,
  TbTrash,
  TbUser,
} from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ActionMenuButton } from '../molecules/ActionMenuButton';
import { ROUTES } from '../../constants/routes';
import type { BlisterRole } from '../../types/blister.types';
import type { Treatment } from '../../types/treatment.types';

interface TreatmentRowProps {
  treatment: Treatment;
  blisterId: string;
  patientName: string;
  patientAvatarKey?: string | null;
  appointmentsCount: number;
  userRole: BlisterRole | null;
  onDelete: (treatment: Treatment) => void;
}

const canMutate = (role: BlisterRole | null): boolean =>
  role === 'OWNER' || role === 'CAREGIVER';

const MS_PER_DAY = 86_400_000;

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
  blisterId,
  patientName,
  patientAvatarKey,
  appointmentsCount,
  userRole,
  onDelete,
}: TreatmentRowProps) {
  const editable = canMutate(userRole);
  const progress = getProgress(treatment);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const medicineCount = treatment.medicines.length;

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
        <Avatar name={patientName || treatment.title} avatarKey={patientAvatarKey ?? undefined} size="md" />
        <div className="c-treatment-row__heading">
          <h3 className="c-treatment-row__title">{treatment.title}</h3>
          <p className="c-treatment-row__patient">
            <TbUser aria-hidden="true" />
            {patientName || 'Paciente'}
          </p>
        </div>
        {editable ? (
          <div className="c-action-menu c-treatment-row__menu" ref={menuRef}>
            <ActionMenuButton
              className="c-treatment-row__menu-toggle"
              label="Acciones del tratamiento"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            />
            {menuOpen ? (
              <div className="c-action-menu__popover c-treatment-row__menu-popover" role="menu">
                <Link
                  className="c-action-menu__item"
                  to={ROUTES.editTreatment(blisterId, treatment.id)}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <TbPencil aria-hidden="true" />
                  <span>Editar</span>
                </Link>
                <button
                  type="button"
                  className="c-action-menu__item c-action-menu__item--danger"
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
