import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbAlertTriangle, TbChevronRight, TbStethoscope } from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import { formatMedicineAlertCount, getMedicineAlerts } from '../../lib/medicine-alerts';
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

function formatStock(medicine: Medicine): string {
  return `${quantityFormatter.format(medicine.stock)} ${medicine.stockUnit}`;
}

/** Tarjeta de botiquín centrada en reconocimiento rápido: foto, nombres, stock y alertas. */
export function MedicineCard({ medicine, blisterId, treatmentCount = 0 }: MedicineCardProps) {
  const alias = medicine.alias?.trim();
  const displayName = alias || medicine.nombre;
  const alertCount = getMedicineAlerts(medicine).length;
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
    <article className="c-medicine-card">
      <Link
        to={ROUTES.medicineDetail(blisterId, medicine._id)}
        className="c-medicine-card__link"
        aria-label={`${displayName}, ${formatStock(medicine)}`}
      >
        <figure className="c-medicine-card__media" aria-hidden="true">
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
        </figure>

        <div className="c-medicine-card__body">
          <h2 className="c-medicine-card__alias">{displayName}</h2>
          <p className="c-medicine-card__real-name">{medicine.nombre}</p>
          <ul className="c-medicine-card__summary" aria-label="Resumen del medicamento">
            <li className="c-medicine-card__summary-item">
              <MedicineIcon type={medicine.iconType} size="sm" className="c-medicine-card__summary-icon" />
              <span>{formatStock(medicine)}</span>
            </li>
            <li className="c-medicine-card__summary-item">
              <TbStethoscope aria-hidden="true" />
              <span>{treatmentCount} tratamiento{treatmentCount === 1 ? '' : 's'}</span>
            </li>
            <li className={['c-medicine-card__summary-item', alertCount > 0 && 'c-medicine-card__summary-item--alert'].filter(Boolean).join(' ')}>
              <TbAlertTriangle aria-hidden="true" />
              <span>{formatMedicineAlertCount(alertCount)}</span>
            </li>
          </ul>
        </div>

        <TbChevronRight className="c-medicine-card__chevron" aria-hidden="true" />
      </Link>
    </article>
  );
}
