import { useCallback, useEffect, useState } from 'react';

import { listBlisters } from '../services/blisters.service';
import { useAuthStore } from '../stores/auth.store';
import { useBlisterStore } from '../stores/blister.store';
import type { Blister, BlisterRole } from '../types/blister.types';
import { isApiError } from '../types/api.types';

interface UseBlistersResult {
  blisters: Blister[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Devuelve el rol del usuario actual dentro de un blister concreto. */
function resolveRole(blister: Blister, userId: string | null): BlisterRole | null {
  if (!userId) return null;
  return blister.members.find((m) => m.userId === userId)?.role ?? null;
}

/**
 * Carga los blisters del usuario autenticado y mantiene el activo coherente.
 * - Si la lista llega vacía, limpia el blister activo.
 * - Si no hay activo y existen blisters, selecciona el primero.
 * - Reconcilia el rol activo cuando el server devuelve otro distinto.
 */
export function useBlisters(preferredBlisterId?: string | null): UseBlistersResult {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const setBlisters = useBlisterStore((state) => state.setBlisters);
  const setActiveBlister = useBlisterStore((state) => state.setActiveBlister);
  const clearActiveBlister = useBlisterStore((state) => state.clearActiveBlister);

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listBlisters();
      setBlisters(list);

      if (list.length === 0) {
        clearActiveBlister();
        return;
      }

      const preferred = preferredBlisterId
        ? list.find((b) => b._id === preferredBlisterId)
        : undefined;
      const stillExists = activeBlisterId
        ? list.find((b) => b._id === activeBlisterId)
        : undefined;
      const target = preferred ?? stillExists ?? list[0];
      const role = resolveRole(target, userId);
      setActiveBlister(target._id, role);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se han podido cargar tus blísters.');
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, [activeBlisterId, clearActiveBlister, preferredBlisterId, setActiveBlister, setBlisters, userId]);

  useEffect(() => {
    void refresh();
    // Solo se ejecuta una vez por montaje del consumidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { blisters, isLoading, hasLoaded, error, refresh };
}
