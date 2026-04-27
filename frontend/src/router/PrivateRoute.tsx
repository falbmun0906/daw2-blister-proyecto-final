import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';

export function PrivateRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Outlet />;
}