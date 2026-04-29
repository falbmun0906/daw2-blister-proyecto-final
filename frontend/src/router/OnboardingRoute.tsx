// src/router/OnboardingRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '../constants/routes';
import { useUiStore } from '../stores/ui.store';

/**
 * Permite acceder a /onboarding cuando:
 *   - el usuario nunca lo ha visto (`!hasSeenOnboarding`), o
 *   - el usuario lo reactivó explícitamente desde Ajustes (`canReplayOnboarding`).
 * En cualquier otro caso, redirige a /landing.
 */
export function OnboardingRoute() {
    const canReplayOnboarding = useUiStore((s) => s.canReplayOnboarding);
    const hasSeenOnboarding = useUiStore((s) => s.hasSeenOnboarding);

    if (!canReplayOnboarding && hasSeenOnboarding) {
        return <Navigate to={ROUTES.landing} replace />;
    }

    return <Outlet />;
}