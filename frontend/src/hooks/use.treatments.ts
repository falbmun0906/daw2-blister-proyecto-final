import { useCallback, useEffect, useState } from 'react';

import {
  createTreatment as createTreatmentRequest,
  listTreatments,
  removeTreatment as removeTreatmentRequest,
  updateTreatment as updateTreatmentRequest,
} from '../services/treatments.service';
import { useBlisterStore } from '../stores/blister.store';
import { useTreatmentsStore } from '../stores/treatments.store';
import { isApiError } from '../types/api.types';
import type {
  CreateTreatmentInput,
  Treatment,
  UpdateTreatmentInput,
} from '../types/treatment.types';

interface UseTreatmentsResult {
  treatments: Treatment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTreatment: (input: CreateTreatmentInput) => Promise<Treatment>;
  updateTreatment: (id: string, input: UpdateTreatmentInput) => Promise<Treatment>;
  removeTreatment: (id: string) => Promise<void>;
}

/** Carga y muta los tratamientos del blíster activo. */
export function useTreatments(blisterIdOverride?: string | null): UseTreatmentsResult {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const blisterId = blisterIdOverride ?? activeBlisterId;
  const treatments = useTreatmentsStore((s) => s.treatments);
  const setTreatments = useTreatmentsStore((s) => s.setTreatments);
  const upsert = useTreatmentsStore((s) => s.upsertTreatment);
  const remove = useTreatmentsStore((s) => s.removeTreatment);
  const clear = useTreatmentsStore((s) => s.clear);

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
      const list = await listTreatments(blisterId);
      setTreatments(list);
    } catch (err) {
      setError(
        isApiError(err) ? err.message : 'No se han podido cargar los tratamientos.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [blisterId, clear, setTreatments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refetch]);

  const createTreatment = useCallback(
    async (input: CreateTreatmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const created = await createTreatmentRequest(blisterId, input);
      upsert(created);
      return created;
    },
    [blisterId, upsert],
  );

  const updateTreatment = useCallback(
    async (id: string, input: UpdateTreatmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const updated = await updateTreatmentRequest(blisterId, id, input);
      upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  const removeTreatment = useCallback(
    async (id: string) => {
      if (!blisterId) return;
      await removeTreatmentRequest(blisterId, id);
      remove(id);
    },
    [blisterId, remove],
  );

  return {
    treatments,
    isLoading,
    error,
    refetch,
    createTreatment,
    updateTreatment,
    removeTreatment,
  };
}
