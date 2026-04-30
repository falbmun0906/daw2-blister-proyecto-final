import { useCallback, useEffect, useState } from 'react';

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

  const refetch = useCallback(async () => {
    if (!blisterId) {
      clear();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listMedicines(blisterId);
      setMedicines(list);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se ha podido cargar el botiquín.');
    } finally {
      setIsLoading(false);
    }
  }, [blisterId, clear, setMedicines]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { medicines, isLoading, error, refetch };
}
