import { Link } from 'react-router-dom';
import { TbAlertTriangle, TbFileText, TbChevronRight } from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import type { Medicine } from '../../types/medicine.types';
import { MedicineIcon } from '../molecules/MedicineIcon';

interface MedicineCardProps {
  medicine: Medicine;
  blisterId: string;
}

/** Calcula días restantes hasta la fecha de caducidad. */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function expiryClass(days: number): string {
  if (days < 0) return 'c-medicine-card__expiry--expired';
  if (days <= 7) return 'c-medicine-card__expiry--warn-7';
  if (days <= 15) return 'c-medicine-card__expiry--warn-15';
  if (days <= 30) return 'c-medicine-card__expiry--warn-30';
  return '';
}

function formatExpiry(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Tarjeta de medicamento con estructura visual:
 *   - Header (fondo tinte primario, esquinas superiores redondeadas):
 *     icono + nombre + chevron a detalle.
 *   - Body: cantidad, caducidad y banderas de contraindicación
 *     (conducción, triángulo amarillo de farmacovigilancia).
 *
 * Toda la tarjeta es enlace al detalle.
 */
export function MedicineCard({ medicine, blisterId }: MedicineCardProps) {
  const days = daysUntil(medicine.expDate);
  const displayName = medicine.alias?.trim() || medicine.nombre;
  const expiryDate = formatExpiry(medicine.expDate);
  const expiredOrWarning = days < 0 || days <= 30;

  return (
    <Link
      to={ROUTES.medicineDetail(blisterId, medicine._id)}
      className="c-medicine-card"
      aria-label={`${displayName}, ${medicine.dosisOficial ?? ''}`}
    >
      <header className="c-medicine-card__header">
        <span className="c-medicine-card__icon" aria-hidden="true">
          <MedicineIcon type={medicine.iconType} size="sm" />
        </span>
        <span className="c-medicine-card__name">{displayName}</span>
        <span className="c-medicine-card__chevron" aria-hidden="true">
          <TbChevronRight className="c-icon c-icon--sm" aria-hidden="true" />
        </span>
      </header>

      <div className="c-medicine-card__body">
        <dl className="c-medicine-card__facts">
          <div className="c-medicine-card__fact">
            <dt className="c-medicine-card__fact-label">Cantidad</dt>
            <dd className="c-medicine-card__fact-value">
              {medicine.stock} {medicine.stockUnit}
            </dd>
          </div>
          <div className="c-medicine-card__fact">
            <dt className="c-medicine-card__fact-label">Caducidad</dt>
            <dd
              className={`c-medicine-card__fact-value ${expiredOrWarning ? expiryClass(days) : ''}`}
            >
              {expiryDate}
            </dd>
          </div>
          {medicine.dosisOficial ? (
            <div className="c-medicine-card__fact">
              <dt className="c-medicine-card__fact-label">Dosis</dt>
              <dd className="c-medicine-card__fact-value">{medicine.dosisOficial}</dd>
            </div>
          ) : null}
        </dl>

        {(medicine.cimaStatus.hasAlerts || medicine.cimaStatus.psum) ? (
          <ul
            className="c-medicine-card__flags"
            aria-label="Advertencias del medicamento"
          >
            {medicine.cimaStatus.hasAlerts ? (
              <li
                className="c-medicine-card__flag c-medicine-card__flag--warning"
                title="Tiene alertas farmacológicas activas"
              >
                <TbAlertTriangle className="c-icon c-icon--sm" aria-hidden="true" />
                <span className="u-sr-only">Alertas farmacológicas</span>
              </li>
            ) : null}
            {medicine.cimaStatus.psum ? (
              <li
                className="c-medicine-card__flag"
                title="Problemas de suministro"
              >
                <TbFileText className="c-icon c-icon--sm" aria-hidden="true" />
                <span className="u-sr-only">Problemas de suministro</span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Link>
  );
}
