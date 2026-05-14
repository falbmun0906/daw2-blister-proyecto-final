import { Outlet } from 'react-router-dom';

import { PageHeader } from '../organisms/PageHeader';

export function PublicPageLayout() {
  return (
    <div className="c-app-layout">
      <PageHeader />
      <main className="c-app-layout__main" id="contenido-principal">
        <Outlet />
      </main>
    </div>
  );
}
