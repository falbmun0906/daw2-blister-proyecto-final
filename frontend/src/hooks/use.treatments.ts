import { captureRequestContext } from '../lib/request-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const requestSequence = useRef(0);
  const visibleItems = useMemo(() => treatments.filter((item) => item.blisterId === blisterId), [treatments, blisterId]);

  const refetch = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (blisterId && blisterId !== activeBlisterId) return;
    const contextIsCurrent = captureRequestContext('treatments');
    const isCurrent = () => contextIsCurrent() && sequence === requestSequence.current;
    if (!blisterId) {
      clear();
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listTreatments(blisterId);
      if (isCurrent()) setTreatments(list);
    } catch (err) {
      if (!isCurrent()) return;
      setError(
        isApiError(err) ? err.message : 'No se han podido cargar los tratamientos.',
      );
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [blisterId, activeBlisterId, clear, setTreatments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestSequence.current += 1;
    };
  }, [refetch]);

  const createTreatment = useCallback(
    async (input: CreateTreatmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const isCurrent = captureRequestContext();
      const created = await createTreatmentRequest(blisterId, input);
      if (isCurrent()) upsert(created);
      return created;
    },
    [blisterId, upsert],
  );

  const updateTreatment = useCallback(
    async (id: string, input: UpdateTreatmentInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const isCurrent = captureRequestContext();
      const updated = await updateTreatmentRequest(blisterId, id, input);
      if (isCurrent()) upsert(updated);
      return updated;
    },
    [blisterId, upsert],
  );

  const removeTreatment = useCallback(
    async (id: string) => {
      if (!blisterId) return;
      const isCurrent = captureRequestContext();
      await removeTreatmentRequest(blisterId, id);
      if (isCurrent()) remove(id);
    },
    [blisterId, remove],
  );

  return {
    treatments: visibleItems,
    isLoading,
    error,
    refetch,
    createTreatment,
    updateTreatment,
    removeTreatment,
  };
}
