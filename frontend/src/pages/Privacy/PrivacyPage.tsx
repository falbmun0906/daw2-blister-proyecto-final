import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { usePageBackOverride } from '../../hooks/use.page-title';
import { PrivacyPolicyContent } from '../../components/organisms/PrivacyPolicyContent';
import { useAuthStore } from '../../stores/auth.store';

const getParentRoute = (state: unknown): string | null => {
  if (typeof state !== 'object' || state === null) return null;
  const candidate = state as { parentRoute?: unknown };
  return typeof candidate.parentRoute === 'string' ? candidate.parentRoute : null;
};

const getReturnState = (state: unknown): object | undefined => {
  if (typeof state !== 'object' || state === null) return undefined;
  const candidate = state as { registerDraft?: unknown };
  return candidate.registerDraft ? { registerDraft: candidate.registerDraft } : undefined;
};

function PrivacyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  usePageTitle('Privacidad');
  usePageBackOverride(() => {
    const parentRoute = getParentRoute(location.state);
    const returnState = getReturnState(location.state);
    navigate(parentRoute ?? (accessToken ? ROUTES.profile : ROUTES.register), { state: returnState });
  });

  return <PrivacyPolicyContent />;
}

export default PrivacyPage;
