// src/router/OnboardingRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { useUiStore } from '../stores/ui.store';

/**
 * Permite acceder a /onboarding solo cuando el dispositivo no lo ha completado.
 */
export function OnboardingRoute() {
    const hasSeenOnboarding = useUiStore((s) => s.hasSeenOnboarding);

    if (hasSeenOnboarding) {
        return <Navigate to={ROUTES.login} replace />;
    }

    return <Outlet />;
}
