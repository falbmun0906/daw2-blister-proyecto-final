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

function PrivacyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  usePageTitle('Privacidad');
  usePageBackOverride(() => {
    const parentRoute = getParentRoute(location.state);
    navigate(parentRoute ?? (accessToken ? ROUTES.profile : ROUTES.register));
  });

  return <PrivacyPolicyContent />;
}

export default PrivacyPage;
