import { Link } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import type { Medicine } from '../../types/medicine.types';
import { MedicineIcon } from '../molecules/MedicineIcon';
import { StockBadge } from '../molecules/StockBadge';

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

export function MedicineCard({ medicine, blisterId }: MedicineCardProps) {
  const days = daysUntil(medicine.expDate);
  const displayName = medicine.alias?.trim() || medicine.nombre;
  const expiryLabel =
    days < 0 ? 'Caducado' : days <= 30 ? `Caduca en ${days} d` : '';

  return (
    <Link
      to={ROUTES.medicineDetail(blisterId, medicine._id)}
      className="c-medicine-card"
      aria-label={`${displayName}, ${medicine.dosisOficial}`}
    >
      <span className="c-medicine-card__icon">
        <MedicineIcon type={medicine.iconType} size="md" />
      </span>
      <span className="c-medicine-card__body">
        <span className="c-medicine-card__name">{displayName}</span>
        <span className="c-medicine-card__dose">{medicine.dosisOficial}</span>
        {expiryLabel ? (
          <span className={`c-medicine-card__expiry ${expiryClass(days)}`}>
            {expiryLabel}
          </span>
        ) : null}
      </span>
      <StockBadge
        stock={medicine.stock}
        threshold={medicine.threshold}
        unit={medicine.stockUnit}
      />
    </Link>
  );
}
