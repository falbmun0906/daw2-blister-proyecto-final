import { Outlet, useMatch } from 'react-router-dom';

import { AppHeader } from '../organisms/AppHeader';
import { PageHeader } from '../organisms/PageHeader';
import { BottomNav } from '../organisms/BottomNav';
import { Toaster } from '../organisms/Toaster';
import { ROUTES } from '../../constants/routes';

/**
 * Layout autenticado: cabecera sticky, contenido scrollable y bottom nav fijo.
 * En `/home` muestra `<AppHeader />` con marca, blíster activo y acciones;
 * en el resto de rutas autenticadas muestra `<PageHeader />` minimalista
 * (botón volver + título). Se monta dentro de `<PrivateRoute />`, así que
 * asume sesión.
 */
export function AppLayout() {
  const isHome = useMatch(ROUTES.home);
  return (
    <div className="c-app-layout">
      {isHome ? <AppHeader /> : <PageHeader />}
      <main className="c-app-layout__main" id="contenido-principal">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
