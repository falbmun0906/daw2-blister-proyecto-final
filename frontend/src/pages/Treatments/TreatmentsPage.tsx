import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ForceDoseDialog } from '../../components/molecules/ForceDoseDialog';
import { UndoToast } from '../../components/molecules/UndoToast';
import { TreatmentRow } from '../../components/organisms/TreatmentRow';
import { ROUTES } from '../../constants/routes';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Treatment } from '../../types/treatment.types';
import './TreatmentsPage.scss';

type FilterMode = 'all' | 'active' | 'archived';

interface PendingDose {
  treatmentId: string;
  medicineId: string;
}

interface ActiveUndo {
  logId: string;
  createdAt: number;
  message: string;
}

function applyFilter(list: Treatment[], mode: FilterMode): Treatment[] {
  if (mode === 'active') return list.filter((t) => t.active);
  if (mode === 'archived') return list.filter((t) => !t.active);
  return list;
}

function TreatmentsPage() {
  usePageTitle('Tratamientos');
  const navigate = useNavigate();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const addToast = useUiStore((s) => s.addToast);
  const { treatments, isLoading, error, refetch, removeTreatment } = useTreatments();
  const { medicines, refetch: refetchMedicines } = useMedicines();
  const { logDose, undoLog } = useAdherence();
  const [filter, setFilter] = useState<FilterMode>('active');
  const [pendingDose, setPendingDose] = useState<PendingDose | null>(null);
  const [activeUndos, setActiveUndos] = useState<ActiveUndo[]>([]);

  const visible = useMemo(() => applyFilter(treatments, filter), [treatments, filter]);
  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';

  const resolveMedicineName = useCallback(
    (medicineId: string): string => {
      const m = medicines.find((med) => med._id === medicineId);
      return m ? m.alias?.trim() || m.nombre : 'Medicamento';
    },
    [medicines],
  );

  const pushUndoToast = useCallback(
    (logId: string, medicineId: string) => {
      setActiveUndos((prev) => [
        ...prev,
        {
          logId,
          createdAt: Date.now(),
          message: `Toma registrada: ${resolveMedicineName(medicineId)}.`,
        },
      ]);
    },
    [resolveMedicineName],
  );

  const dismissUndoToast = useCallback((logId: string) => {
    setActiveUndos((prev) => prev.filter((u) => u.logId !== logId));
  }, []);

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  const handleDelete = async (treatment: Treatment): Promise<void> => {
    if (!window.confirm(`¿Eliminar el tratamiento "${treatment.title}"?`)) return;
    try {
      await removeTreatment(treatment.id);
      addToast({ message: 'Tratamiento eliminado.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido eliminar.';
      addToast({ message, variant: 'error' });
    }
  };

  const handleLogDose = async (treatmentId: string, medicineId: string): Promise<void> => {
    try {
      const log = await logDose({ treatmentId, medicineId });
      await refetchMedicines();
      pushUndoToast(log.id, medicineId);
    } catch (err) {
      if (isStockInsufficientError(err)) {
        setPendingDose({ treatmentId, medicineId });
        return;
      }
      const message = isApiError(err) ? err.message : 'No se ha podido registrar la toma.';
      addToast({ message, variant: 'error' });
    }
  };

  const handleForceConfirm = async (notes: string): Promise<void> => {
    if (!pendingDose) return;
    const { treatmentId, medicineId } = pendingDose;
    setPendingDose(null);
    try {
      const log = await logDose({ treatmentId, medicineId, force: true, notes });
      await refetchMedicines();
      pushUndoToast(log.id, medicineId);
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido registrar la toma forzada.';
      addToast({ message, variant: 'error' });
    }
  };

  const handleUndo = async (logId: string): Promise<void> => {
    dismissUndoToast(logId);
    try {
      await undoLog(logId);
      await refetchMedicines();
      addToast({ message: 'Toma deshecha.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido deshacer la toma.';
      addToast({ message, variant: 'error' });
    }
  };

  return (
    <section className="c-treatments-page" aria-label="Listado de tratamientos">
      <header className="c-treatments-page__header">
        {canMutate ? (
          <Button variant="primary" onClick={() => navigate(ROUTES.newTreatment(activeBlisterId))}>
            Añadir
          </Button>
        ) : null}
      </header>

      <div className="c-treatments-page__filters" role="tablist" aria-label="Filtro de tratamientos">
        {(['active', 'archived', 'all'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={filter === mode}
            className={`c-treatments-page__filter ${filter === mode ? 'is-active' : ''}`}
            onClick={() => setFilter(mode)}
          >
            {mode === 'active' ? 'Activos' : mode === 'archived' ? 'Archivados' : 'Todos'}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="c-treatments-page__list" aria-busy="true">
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'archived' ? 'Sin tratamientos archivados' : 'Aún no tienes tratamientos'}
          description={
            canMutate
              ? 'Crea uno para vincular medicamentos con dosis y frecuencia.'
              : 'Pide al administrador del blíster que cree tratamientos.'
          }
          ctaLabel={canMutate && filter !== 'archived' ? 'Crear tratamiento' : undefined}
          onCtaClick={
            canMutate && filter !== 'archived'
              ? () => navigate(ROUTES.newTreatment(activeBlisterId))
              : undefined
          }
        />
      ) : (
        <ul className="c-treatments-page__list">
          {visible.map((treatment) => (
            <li key={treatment.id} className="c-treatments-page__item">
              <TreatmentRow
                treatment={treatment}
                medicines={medicines}
                blisterId={activeBlisterId}
                userRole={activeRole}
                onDelete={handleDelete}
                onLogDose={canMutate ? handleLogDose : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      <ForceDoseDialog
        isOpen={pendingDose !== null}
        onConfirm={(notes) => void handleForceConfirm(notes)}
        onCancel={() => setPendingDose(null)}
      />

      {activeUndos.length > 0 ? (
        <div className="c-treatments-page__undo-stack" aria-live="polite">
          {activeUndos.map((undo) => (
            <UndoToast
              key={undo.logId}
              logId={undo.logId}
              message={undo.message}
              createdAt={undo.createdAt}
              onUndo={(id) => void handleUndo(id)}
              onExpire={dismissUndoToast}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default TreatmentsPage;
