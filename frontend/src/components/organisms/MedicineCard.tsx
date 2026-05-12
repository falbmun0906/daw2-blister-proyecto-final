import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbChevronRight } from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import { getCimaDetail } from '../../services/external.service';
import type { Medicine } from '../../types/medicine.types';
import { MedicineIcon } from '../molecules/MedicineIcon';

interface MedicineCardProps {
  medicine: Medicine;
  blisterId: string;
  treatmentCount?: number;
}

type CimaPhoto = Awaited<ReturnType<typeof getCimaDetail>>['fotos'][number];
type MedicineImageState = {
  nregist: string;
  url: string | null;
  failed: boolean;
};

const quantityFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

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

function formatStock(medicine: Medicine): string {
  return `${quantityFormatter.format(medicine.stock)} ${medicine.stockUnit}`;
}

function getAlertCount(medicine: Medicine, daysToExpiry: number): number {
  return [
    medicine.cimaStatus.hasAlerts,
    medicine.cimaStatus.psum,
    medicine.stock <= medicine.threshold,
    daysToExpiry <= 30,
  ].filter(Boolean).length;
}

function formatAlertCount(alertCount: number): string {
  if (alertCount === 0) return 'Sin alertas';
  if (alertCount === 1) return '1 alerta';
  return `${alertCount} alertas`;
}

/** Tarjeta de botiquín centrada en reconocimiento rápido: foto, nombres, stock y alertas. */
export function MedicineCard({ medicine, blisterId, treatmentCount = 0 }: MedicineCardProps) {
  const days = daysUntil(medicine.expDate);
  const alias = medicine.alias?.trim();
  const displayName = alias || medicine.nombre;
  const alertCount = getAlertCount(medicine, days);
  const [imageState, setImageState] = useState<MedicineImageState | null>(null);
  const loadedImage = imageState?.nregist === medicine.nregist ? imageState : null;
  const imageUrl = loadedImage?.failed ? null : loadedImage?.url ?? null;

  useEffect(() => {
    let cancelled = false;

    getCimaDetail(medicine.nregist)
      .then((info) => {
        if (!cancelled) {
          setImageState({
            nregist: medicine.nregist,
            url: info.fotos.find((foto: CimaPhoto) => foto.url)?.url ?? null,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageState({ nregist: medicine.nregist, url: null, failed: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [medicine.nregist]);

  return (
    <Link
      to={ROUTES.medicineDetail(blisterId, medicine._id)}
      className="c-medicine-card"
      aria-label={`${displayName}, ${formatStock(medicine)}`}
    >
      <span className="c-medicine-card__media" aria-hidden="true">
        {imageUrl ? (
          <img
            className="c-medicine-card__image"
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageState({ nregist: medicine.nregist, url: imageUrl, failed: true })}
          />
        ) : (
          <MedicineIcon type={medicine.iconType} size="md" />
        )}
      </span>

      <span className="c-medicine-card__body">
        <span className="c-medicine-card__alias">{displayName}</span>
        <span className="c-medicine-card__real-name">{medicine.nombre}</span>
        <span className="c-medicine-card__summary">
          <span>{formatStock(medicine)}</span>
          <span>{treatmentCount} tratamiento{treatmentCount === 1 ? '' : 's'}</span>
          <span className={alertCount > 0 ? ['c-medicine-card__alert', expiryClass(days)].filter(Boolean).join(' ') : undefined}>
            {formatAlertCount(alertCount)}
          </span>
        </span>
      </span>

      <TbChevronRight className="c-medicine-card__chevron" aria-hidden="true" />
    </Link>
  );
}
