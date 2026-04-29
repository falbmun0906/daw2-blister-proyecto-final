import { Outlet, useMatch } from 'react-router-dom';

import { AppHeader } from '../organisms/AppHeader';
import { PageHeader } from '../organisms/PageHeader';
import { BottomNav } from '../organisms/BottomNav';
import { Toaster } from '../organisms/Toaster';
import { ROUTES } from '../../constants/routes';

/**
 * Layout autenticado: cabecera sticky, contenido scrollable y bottom nav fijo.
 * - En `/home` muestra `<AppHeader />` con marca, blíster activo y acciones.
 * - En el listado de medicamentos (`/blisters/:id/medicines`) la pantalla
 *   monta su propio header con icono de botiquín; aquí se omite el genérico.
 * - En el resto de rutas autenticadas muestra `<PageHeader />` minimalista
 *   (botón volver + título).
 */
export function AppLayout() {
  const isHome = useMatch(ROUTES.home);
  const isInventory = useMatch('/blisters/:blisterId/medicines');

  let header: React.ReactNode = <PageHeader />;
  if (isHome) header = <AppHeader />;
  else if (isInventory) header = null;

  return (
    <div className="c-app-layout">
      {header}
      <main className="c-app-layout__main" id="contenido-principal">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
