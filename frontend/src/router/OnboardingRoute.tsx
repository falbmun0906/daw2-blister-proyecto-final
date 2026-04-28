// src/router/OnboardingRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useUiStore } from '../stores/ui.store';

export function OnboardingRoute() {
    const canReplayOnboarding = useUiStore((s) => s.canReplayOnboarding);

    if (!canReplayOnboarding) {
        // si no tienes el flag activo, no entras a onboarding
        return <Navigate to={ROUTES.landing} replace />;
    }

    return <Outlet />;
}