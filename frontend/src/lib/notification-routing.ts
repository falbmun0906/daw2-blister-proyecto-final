import { ROUTES } from '../constants/routes';
import type { NotificationView } from '../types/notification.types';

const getStringMetadata = (notification: NotificationView, key: string): string | null => {
  const value = notification.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

export const getNotificationTargetRoute = (notification: NotificationView): string | null => {
  const blisterId = notification.blisterId;
  const medicineId = getStringMetadata(notification, 'medicineId');

  if ((notification.type === 'stock_low' || notification.type === 'expiration_warning') && blisterId && medicineId) {
    return ROUTES.editMedicine(blisterId, medicineId);
  }

  if (notification.type === 'cima_change') {
    const nregist = getStringMetadata(notification, 'nregist');
    if (nregist) return ROUTES.cimaMedicineDetail(nregist);
    if (blisterId && medicineId) return ROUTES.medicineDetail(blisterId, medicineId);
  }

  if (notification.type === 'adherence_forced' && blisterId) {
    return ROUTES.blisterLogs(blisterId);
  }

  return null;
};
