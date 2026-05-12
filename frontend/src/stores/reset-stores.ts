import { useAdherenceStore } from './adherence.store';
import { useAppointmentsStore } from './appointments.store';
import { useBlisterStore } from './blister.store';
import { useMedicinesStore } from './medicines.store';
import { useNotificationsStore } from './notifications.store';
import { useTreatmentsStore } from './treatments.store';

/**
 * Limpia todos los stores de datos vinculados a la sesión.
 * Debe llamarse al cerrar sesión y al iniciar sesión con un usuario distinto
 * para evitar que datos persistidos (como `blister-active`)
 * pertenecientes al usuario anterior se reutilicen en otra cuenta.
 */
export function resetAppStores(): void {
  useBlisterStore.setState({ blisters: [], activeBlisterId: null, activeRole: null });
  useTreatmentsStore.getState().clear();
  useAppointmentsStore.getState().clear();
  useMedicinesStore.getState().clear();
  useNotificationsStore.getState().reset();
  useAdherenceStore.getState().clear();
}
