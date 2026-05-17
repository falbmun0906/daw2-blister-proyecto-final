import {
  MEDICINE_EXPIRY_WARNING_DAYS,
  MS_PER_DAY,
} from '../constants/medicine.constants';
import type { Medicine } from '../types/medicine.types';

export type MedicineAlertKind =
  | 'stock-empty'
  | 'stock-low'
  | 'expired'
  | 'expiring'
  | 'not-commercialized'
  | 'supply'
  | 'cima';

export interface MedicineAlertItem {
  kind: MedicineAlertKind;
  label: string;
  detail?: string;
}

function getDaysUntilExpiry(expDate: string): number | null {
  const expiry = new Date(expDate);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry.getTime() - Date.now()) / MS_PER_DAY);
}

/** Devuelve las alertas vigentes combinando stock, caducidad y estado CIMA. */
export function getMedicineAlerts(medicine: Medicine): MedicineAlertItem[] {
  const alerts: MedicineAlertItem[] = [];
  const daysUntilExpiry = getDaysUntilExpiry(medicine.expDate);

  if (medicine.stock <= 0) {
    alerts.push({ kind: 'stock-empty', label: 'Sin stock' });
  } else if (medicine.stock <= medicine.threshold) {
    alerts.push({ kind: 'stock-low', label: 'Stock bajo' });
  }

  if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
    alerts.push({ kind: 'expired', label: 'Caducado' });
  } else if (
    daysUntilExpiry !== null
    && daysUntilExpiry <= MEDICINE_EXPIRY_WARNING_DAYS
  ) {
    alerts.push({ kind: 'expiring', label: 'Caduca pronto' });
  }

  if (!medicine.cimaStatus.comerc) {
    alerts.push({ kind: 'not-commercialized', label: 'No comercializado', detail: 'CIMA indica que no está comercializado actualmente.' });
  }

  if (medicine.cimaStatus.estado === 2) {
    alerts.push({ kind: 'cima', label: 'Estado suspendido', detail: 'CIMA marca una suspensión de autorización.' });
  }

  if (medicine.cimaStatus.estado === 3) {
    alerts.push({ kind: 'cima', label: 'Estado revocado', detail: 'CIMA marca una revocación de autorización.' });
  }

  if (medicine.cimaStatus.psum) {
    alerts.push({ kind: 'supply', label: 'Problemas de suministro', detail: 'CIMA informa de problemas de suministro.' });
  }

  if (medicine.cimaStatus.notas) {
    alerts.push({ kind: 'cima', label: 'Nota de seguridad CIMA', detail: 'Hay notas de seguridad oficiales asociadas al medicamento.' });
  }

  if (medicine.cimaStatus.materialesInf) {
    alerts.push({ kind: 'cima', label: 'Material informativo CIMA', detail: 'Hay materiales informativos oficiales asociados al medicamento.' });
  }

  if (
    medicine.cimaStatus.hasAlerts
    && !medicine.cimaStatus.psum
    && !medicine.cimaStatus.notas
    && !medicine.cimaStatus.materialesInf
  ) {
    alerts.push({ kind: 'cima', label: 'Alerta CIMA', detail: 'CIMA informa de una alerta oficial vigente.' });
  }

  return alerts;
}

export function formatMedicineAlertCount(alertCount: number): string {
  if (alertCount === 0) return 'Sin alertas';
  if (alertCount === 1) return '1 alerta';
  return `${alertCount} alertas`;
}
