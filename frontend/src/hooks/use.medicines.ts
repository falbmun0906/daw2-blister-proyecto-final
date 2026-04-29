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
export function useMedicines(): UseMedicinesResult {
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const medicines = useMedicinesStore((state) => state.medicines);
  const setMedicines = useMedicinesStore((state) => state.setMedicines);
  const clear = useMedicinesStore((state) => state.clear);

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
      const list = await listMedicines(activeBlisterId);
      setMedicines(list);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se ha podido cargar el botiquín.');
    } finally {
      setIsLoading(false);
    }
  }, [activeBlisterId, clear, setMedicines]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { medicines, isLoading, error, refetch };
}
