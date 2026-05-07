import { useCallback, useEffect, useState } from 'react';

import {
  addAppointmentComment as addAppointmentCommentRequest,
  createAppointment as createAppointmentRequest,
  listAppointments,
  removeAppointment as removeAppointmentRequest,
  removeAppointmentComment as removeAppointmentCommentRequest,
  updateAppointmentComment as updateAppointmentCommentRequest,
  updateAppointment as updateAppointmentRequest,
} from '../services/appointments.service';
import { useAppointmentsStore } from '../stores/appointments.store';
import { useBlisterStore } from '../stores/blister.store';
import { isApiError } from '../types/api.types';
import type {
  Appointment,
  AppointmentCommentInput,
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
  addAppointmentComment: (id: string, input: AppointmentCommentInput) => Promise<Appointment>;
  updateAppointmentComment: (
    id: string,
    commentId: string,
    input: AppointmentCommentInput,
  ) => Promise<Appointment>;
  removeAppointmentComment: (id: string, commentId: string) => Promise<Appointment>;
}

/** Carga y muta las citas del blíster activo. */
export function useAppointments(blisterIdOverride?: string | null): UseAppointmentsResult {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const blisterId = blisterIdOverride ?? activeBlisterId;
  const appointments = useAppointmentsStore((s) => s.appointments);
  const setAppointments = useAppointmentsStore((s) => s.setAppointments);
  const upsert = useAppointmentsStore((s) => s.upsertAppointment);
  const remove = useAppointmentsStore((s) => s.removeAppointment);
  const clear = useAppointmentsStore((s) => s.clear);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!blisterId) {
      clear();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listAppointments(blisterId);
      setAppointments(list);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se han podido cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  }, [blisterId, clear, setAppointments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refetch]);

  const createAppointment = useCallback(
    async (input: CreateAppointmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const created = await createAppointmentRequest(blisterId, input);
      upsert(created);
      return created;
    },
    [blisterId, upsert],
  );

  const updateAppointment = useCallback(
    async (id: string, input: UpdateAppointmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await updateAppointmentRequest(blisterId, id, input);
      upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      if (!blisterId) return;
      await removeAppointmentRequest(blisterId, id);
      remove(id);
    },
    [blisterId, remove],
  );

  const addAppointmentComment = useCallback(
    async (id: string, input: AppointmentCommentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await addAppointmentCommentRequest(blisterId, id, input);
      upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  const updateAppointmentComment = useCallback(
    async (id: string, commentId: string, input: AppointmentCommentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await updateAppointmentCommentRequest(blisterId, id, commentId, input);
      upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  const removeAppointmentComment = useCallback(
    async (id: string, commentId: string) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await removeAppointmentCommentRequest(blisterId, id, commentId);
      upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  return {
    appointments,
    isLoading,
    error,
    refetch,
    createAppointment,
    updateAppointment,
    removeAppointment,
    addAppointmentComment,
    updateAppointmentComment,
    removeAppointmentComment,
  };
}
