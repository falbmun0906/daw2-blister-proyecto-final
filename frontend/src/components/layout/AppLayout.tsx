import { Outlet } from 'react-router-dom';

import { AppHeader } from '../organisms/AppHeader';
import { BottomNav } from '../organisms/BottomNav';
import { Toaster } from '../organisms/Toaster';

/**
 * Layout autenticado: cabecera sticky, contenido scrollable y bottom nav fijo.
 * Se monta dentro de `<PrivateRoute />`, así que asume sesión.
 */
export function AppLayout() {
  return (
    <div className="c-app-layout">
      <AppHeader />
      <main className="c-app-layout__main" id="contenido-principal">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
