import { captureRequestContext } from '../lib/request-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  listAdherenceLogs,
  logDose as logDoseRequest,
  undoLog as undoLogRequest,
} from '../services/adherence.service';
import { useAdherenceStore } from '../stores/adherence.store';
import { useBlisterStore } from '../stores/blister.store';
import { ApiError, isApiError } from '../types/api.types';
import {
  ADHERENCE_STOCK_INSUFFICIENT,
  type AdherenceLog,
  type CreateAdherenceLogInput,
} from '../types/adherence.types';

interface UseAdherenceResult {
  logs: AdherenceLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /**
   * Registra una toma. Si el backend responde `422 ADHERENCE_STOCK_INSUFFICIENT`
   * se relanza el `ApiError` para que la UI abra el `ForceDoseDialog` (no se
   * convierte en error genérico ni se muestra toast).
   */
  logDose: (input: CreateAdherenceLogInput) => Promise<AdherenceLog>;
  logDoseInBlister: (targetBlisterId: string, input: CreateAdherenceLogInput) => Promise<AdherenceLog>;
  /** Solo posible dentro de la ventana de undo. */
  undoLog: (logId: string) => Promise<void>;
  undoLogInBlister: (targetBlisterId: string, logId: string) => Promise<void>;
}

/**
 * Detecta el caso especial 422 stock insuficiente que la UI debe gestionar
 * con el diálogo de forzado en vez de un error genérico.
 */
export function isStockInsufficientError(value: unknown): value is ApiError {
  return isApiError(value) && value.code === ADHERENCE_STOCK_INSUFFICIENT;
}

/** Carga y muta los logs de adherencia del blíster activo. */
export function useAdherence(blisterIdOverride?: string | null): UseAdherenceResult {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const blisterId = blisterIdOverride ?? activeBlisterId;
  const logs = useAdherenceStore((s) => s.logs);
  const setLogs = useAdherenceStore((s) => s.setLogs);
  const addLog = useAdherenceStore((s) => s.addLog);
  const removeLog = useAdherenceStore((s) => s.removeLog);
  const clear = useAdherenceStore((s) => s.clear);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSequence = useRef(0);
  const visibleItems = useMemo(() => logs.filter((item) => item.blisterId === blisterId), [logs, blisterId]);

  const refetch = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (blisterId && blisterId !== activeBlisterId) return;
    const contextIsCurrent = captureRequestContext('adherence');
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
      const list = await listAdherenceLogs(blisterId);
      if (isCurrent()) setLogs(list);
    } catch (err) {
      if (!isCurrent()) return;
      setError(isApiError(err) ? err.message : 'No se ha podido cargar el historial.');
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [blisterId, activeBlisterId, clear, setLogs]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestSequence.current += 1;
    };
  }, [refetch]);

  const logDose = useCallback(
    async (input: CreateAdherenceLogInput) => {
      if (!blisterId) {
        throw new Error('No hay blíster activo.');
      }
      const isCurrent = captureRequestContext();
      const created = await logDoseRequest(blisterId, input);
      if (isCurrent()) addLog(created);
      return created;
    },
    [blisterId, addLog],
  );

  const logDoseInBlister = useCallback(
    async (targetBlisterId: string, input: CreateAdherenceLogInput) => {
      const isCurrent = captureRequestContext();
      const created = await logDoseRequest(targetBlisterId, input);
      if (isCurrent() && targetBlisterId === useBlisterStore.getState().activeBlisterId) addLog(created);
      return created;
    },
    [addLog],
  );

  const undoLog = useCallback(
    async (logId: string) => {
      if (!blisterId) return;
      const isCurrent = captureRequestContext();
      await undoLogRequest(blisterId, logId);
      if (isCurrent()) removeLog(logId);
    },
    [blisterId, removeLog],
  );

  const undoLogInBlister = useCallback(
    async (targetBlisterId: string, logId: string) => {
      const isCurrent = captureRequestContext();
      await undoLogRequest(targetBlisterId, logId);
      if (isCurrent()) removeLog(logId);
    },
    [removeLog],
  );

  return {
    logs: visibleItems,
    isLoading,
    error,
    refetch,
    logDose,
    logDoseInBlister,
    undoLog,
    undoLogInBlister,
  };
}
