import { create } from 'zustand';

interface PageTitleState {
  title: string;
  setTitle: (title: string) => void;
  clear: () => void;
}

/**
 * Store auxiliar usado por las páginas para registrar su título dinámico
 * y por el shell (AppLayout) para renderizar el header minimalista.
 */
export const usePageTitleStore = create<PageTitleState>((set) => ({
  title: '',
  setTitle: (title) => set({ title }),
  clear: () => set({ title: '' }),
}));
