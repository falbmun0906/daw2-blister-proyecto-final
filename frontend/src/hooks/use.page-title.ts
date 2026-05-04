import { useEffect, useLayoutEffect } from 'react';

import { usePageTitleStore } from '../stores/page-title.store';

/**
 * Registra el título de la página actual en el store global. Cualquier
 * página que necesite mostrar título en el header minimalista puede usar
 * este hook al montarse. Al desmontar restaura el título a vacío.
 */
export function usePageTitle(title: string): void {
  const setTitle = usePageTitleStore((s) => s.setTitle);
  const clear = usePageTitleStore((s) => s.clear);

  useLayoutEffect(() => {
    setTitle(title);
    return () => clear();
  }, [title, setTitle, clear]);
}

/**
 * Sobrescribe el comportamiento del botón "volver" en el header global.
 * Útil cuando una página tiene un flujo interno (ej. pasos) y "volver"
 * debe deshacer el paso en lugar de salir de la ruta.
 */
export function usePageBackOverride(handler: (() => void) | null): void {
  const setBackHandler = usePageTitleStore((s) => s.setBackHandler);

  useEffect(() => {
    setBackHandler(handler);
    return () => setBackHandler(null);
  }, [handler, setBackHandler]);
}
