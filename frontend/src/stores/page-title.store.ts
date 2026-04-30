import { create } from 'zustand';

interface PageTitleState {
  title: string;
  /** Si una página define este handler, el botón "volver" lo ejecuta en lugar de `navigate(-1)`. */
  backHandler: (() => void) | null;
  setTitle: (title: string) => void;
  clear: () => void;
  setBackHandler: (handler: (() => void) | null) => void;
}

/**
 * Store auxiliar usado por las páginas para registrar su título dinámico
 * y por el shell (AppLayout) para renderizar el header minimalista.
 */
export const usePageTitleStore = create<PageTitleState>((set) => ({
  title: '',
  backHandler: null,
  setTitle: (title) => set({ title }),
  clear: () => set({ title: '' }),
  setBackHandler: (handler) => set({ backHandler: handler }),
}));
