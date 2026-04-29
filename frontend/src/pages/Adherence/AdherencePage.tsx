import { Navigate } from 'react-router-dom';

import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { AdherenceLogItem } from '../../components/organisms/AdherenceLogItem';
import { ROUTES } from '../../constants/routes';
import { useAdherence } from '../../hooks/use.adherence';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { AdherenceLog } from '../../types/adherence.types';
import './AdherencePage.scss';

function AdherencePage() {
  usePageTitle('Historial de adherencia');
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const addToast = useUiStore((s) => s.addToast);
  const { logs, isLoading, error, refetch, undoLog } = useAdherence();
  const { medicines } = useMedicines();

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  const handleUndo = async (log: AdherenceLog): Promise<void> => {
    try {
      await undoLog(log.id);
      addToast({ message: 'Toma deshecha.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido deshacer la toma.';
      addToast({ message, variant: 'error' });
    }
  };

  return (
    <section className="c-adherence-page" aria-labelledby="adherence-title">
      <header className="c-adherence-page__header">
        <h1 id="adherence-title" className="c-adherence-page__title">Historial de tomas</h1>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="c-adherence-page__list" aria-busy="true">
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="Sin tomas registradas"
          description="Las tomas aparecerán aquí en cuanto las registres desde un tratamiento."
        />
      ) : (
        <ul className="c-adherence-page__list">
          {logs.map((log) => (
            <li key={log.id} className="c-adherence-page__item">
              <AdherenceLogItem
                log={log}
                medicines={medicines}
                currentUserId={currentUserId}
                onUndo={handleUndo}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdherencePage;
