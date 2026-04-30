import { Outlet, useMatch } from 'react-router-dom';

import { AppHeader } from '../organisms/AppHeader';
import { PageHeader } from '../organisms/PageHeader';
import { BottomNav } from '../organisms/BottomNav';
import { NotificationsSheet } from '../organisms/NotificationsSheet';
import { Toaster } from '../organisms/Toaster';
import { ROUTES } from '../../constants/routes';

/**
 * Layout autenticado: cabecera sticky, contenido scrollable y bottom nav fijo.
 * - En `/home` muestra `<AppHeader />` con marca, blíster activo y acciones.
 * - En el resto de rutas autenticadas muestra `<PageHeader />` minimalista
 *   (botón volver + título registrado vía `usePageTitle`).
 */
export function AppLayout() {
  const isHome = useMatch(ROUTES.home);
  const header: React.ReactNode = isHome ? <AppHeader /> : <PageHeader />;

  return (
    <div className="c-app-layout">
      {header}
      <main className="c-app-layout__main" id="contenido-principal">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
      <NotificationsSheet />
    </div>
  );
}
