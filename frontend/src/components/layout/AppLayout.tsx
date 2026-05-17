import { Outlet, useMatch } from 'react-router-dom';

import { AppHeader } from '../organisms/AppHeader';
import { PageHeader } from '../organisms/PageHeader';
import { BottomNav } from '../organisms/BottomNav';
import { NotificationsSheet } from '../organisms/NotificationsSheet';
import { ROUTES } from '../../constants/routes';

/**
 * Layout autenticado: cabecera sticky, contenido scrollable y bottom nav fijo.
 * - En `/home` muestra `<AppHeader />` con marca, blíster activo y acciones.
 * - En el resto de rutas autenticadas muestra `<PageHeader />` minimalista
 *   (botón volver + título registrado vía `usePageTitle`).
 */
export function AppLayout() {
  const isHome = useMatch(ROUTES.home);
  const isMedicineBranch = useMatch(ROUTES.blisterMedications(':blisterId'));
  const isTreatmentsBranch = useMatch(ROUTES.blisterTreatments(':blisterId'));
  const isAppointmentsBranch = useMatch(ROUTES.blisterAppointments(':blisterId'));
  const showBottomNav = Boolean(isHome || isMedicineBranch || isTreatmentsBranch || isAppointmentsBranch);
  const header: React.ReactNode = isHome ? <AppHeader /> : <PageHeader />;

  return (
    <div className="c-app-layout">
      {header}
      <main
        className={['c-app-layout__main', showBottomNav && 'c-app-layout__main--with-bottom-nav', isHome && 'c-app-layout__main--home'].filter(Boolean).join(' ')}
        id="contenido-principal"
      >
        <Outlet />
      </main>
      {showBottomNav ? <BottomNav /> : null}
      <NotificationsSheet />
    </div>
  );
}
