import { captureRequestContext } from '../lib/request-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listMedicines } from '../services/medicines.service';
import { useBlisterStore } from '../stores/blister.store';
import { useMedicinesStore } from '../stores/medicines.store';
import { isApiError } from '../types/api.types';
import type { Medicine } from '../types/medicine.types';

interface UseMedicinesResult {
  medicines: Medicine[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Carga el botiquín del blíster activo. Mantiene `useMedicinesStore`
 * sincronizado y expone helpers para refrescar tras mutaciones.
 */
export function useMedicines(blisterIdOverride?: string | null): UseMedicinesResult {
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const blisterId = blisterIdOverride ?? activeBlisterId;
  const medicines = useMedicinesStore((state) => state.medicines);
  const setMedicines = useMedicinesStore((state) => state.setMedicines);
  const clear = useMedicinesStore((state) => state.clear);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSequence = useRef(0);
  const visibleItems = useMemo(() => medicines.filter((item) => item.blisterId === blisterId), [medicines, blisterId]);

  const refetch = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (blisterId && blisterId !== activeBlisterId) return;
    const contextIsCurrent = captureRequestContext('medicines');
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
      const list = await listMedicines(blisterId);
      if (isCurrent()) setMedicines(list);
    } catch (err) {
      if (!isCurrent()) return;
      setError(isApiError(err) ? err.message : 'No se ha podido cargar el botiquín.');
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [blisterId, activeBlisterId, clear, setMedicines]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestSequence.current += 1;
    };
  }, [refetch]);

  return { medicines: visibleItems, isLoading, error, refetch };
}
