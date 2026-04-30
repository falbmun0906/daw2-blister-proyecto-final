import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';

/**
 * Guard espec�fico para `/login`.
 * - Si hay sesi�n: redirige a /blisters.
 * - Si no hay sesi�n y el usuario nunca ha visto el onboarding: lo env�a a /onboarding.
 * - En cualquier otro caso, deja pasar al `LoginPage`.
 *
 * Mantenemos /register y /forgot-password bajo el `GuestRoute` est�ndar para que
 * no se vean afectados por la puerta de onboarding.
 */
export function LoginRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasSeenOnboarding = useUiStore((state) => state.hasSeenOnboarding);

  if (accessToken) {
    return <Navigate to={ROUTES.home} replace />;
  }

  if (!hasSeenOnboarding) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }

  return <Outlet />;
}
