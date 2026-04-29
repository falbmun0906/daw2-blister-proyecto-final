import { useCallback, useEffect, useState } from 'react';

import {
  createAppointment as createAppointmentRequest,
  listAppointments,
  removeAppointment as removeAppointmentRequest,
  updateAppointment as updateAppointmentRequest,
} from '../services/appointments.service';
import { useAppointmentsStore } from '../stores/appointments.store';
import { useBlisterStore } from '../stores/blister.store';
import { isApiError } from '../types/api.types';
import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../types/appointment.types';

interface UseAppointmentsResult {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAppointment: (input: CreateAppointmentInput) => Promise<Appointment>;
  updateAppointment: (id: string, input: UpdateAppointmentInput) => Promise<Appointment>;
  removeAppointment: (id: string) => Promise<void>;
}

/** Carga y muta las citas del blíster activo. */
export function useAppointments(): UseAppointmentsResult {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const appointments = useAppointmentsStore((s) => s.appointments);
  const setAppointments = useAppointmentsStore((s) => s.setAppointments);
  const upsert = useAppointmentsStore((s) => s.upsertAppointment);
  const remove = useAppointmentsStore((s) => s.removeAppointment);
  const clear = useAppointmentsStore((s) => s.clear);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!activeBlisterId) {
      clear();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listAppointments(activeBlisterId);
      setAppointments(list);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se han podido cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  }, [activeBlisterId, clear, setAppointments]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createAppointment = useCallback(
    async (input: CreateAppointmentInput) => {
      if (!activeBlisterId) {
        throw new Error('No hay blíster activo.');
      }
      const created = await createAppointmentRequest(activeBlisterId, input);
      upsert(created);
      return created;
    },
    [activeBlisterId, upsert],
  );

  const updateAppointment = useCallback(
    async (id: string, input: UpdateAppointmentInput) => {
      if (!activeBlisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await updateAppointmentRequest(activeBlisterId, id, input);
      upsert(updated);
      return updated;
    },
    [activeBlisterId, upsert],
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      if (!activeBlisterId) return;
      await removeAppointmentRequest(activeBlisterId, id);
      remove(id);
    },
    [activeBlisterId, remove],
  );

  return {
    appointments,
    isLoading,
    error,
    refetch,
    createAppointment,
    updateAppointment,
    removeAppointment,
  };
}
