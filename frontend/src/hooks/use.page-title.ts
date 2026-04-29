import { useEffect } from 'react';

import { usePageTitleStore } from '../stores/page-title.store';

/**
 * Registra el título de la página actual en el store global. Cualquier
 * página que necesite mostrar título en el header minimalista puede usar
 * este hook al montarse. Al desmontar restaura el título a vacío.
 */
export function usePageTitle(title: string): void {
  const setTitle = usePageTitleStore((s) => s.setTitle);
  const clear = usePageTitleStore((s) => s.clear);

  useEffect(() => {
    setTitle(title);
    return () => clear();
  }, [title, setTitle, clear]);
}
