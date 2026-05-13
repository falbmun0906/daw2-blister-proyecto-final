import { usePageTitle } from '../../hooks/use.page-title';
import { PrivacyPolicyContent } from '../../components/organisms/PrivacyPolicyContent';

function PrivacyPage() {
  usePageTitle('Privacidad');

  return <PrivacyPolicyContent />;
}

export default PrivacyPage;
