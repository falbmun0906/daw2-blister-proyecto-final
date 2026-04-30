import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { BlisterPillSelector } from '../../components/organisms/BlisterPillSelector';
import { TreatmentRow } from '../../components/organisms/TreatmentRow';
import { ROUTES } from '../../constants/routes';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Treatment } from '../../types/treatment.types';
import './TreatmentsPage.scss';

function TreatmentsPage() {
  usePageTitle('Tratamientos');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const addToast = useUiStore((s) => s.addToast);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const { treatments, isLoading, error, refetch, removeTreatment } = useTreatments(blisterId);
  const { medicines } = useMedicines(blisterId);

  const visible = useMemo(
    () => [...treatments].sort((left, right) => Number(right.active) - Number(left.active)),
    [treatments],
  );
  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const routeRole = useMemo(
    () => currentBlister?.members.find((member) => member.userId === userId)?.role ?? null,
    [currentBlister, userId],
  );
  const role = routeRole ?? (blisterId === activeBlisterId ? activeRole : null);
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';
  const getPatient = useCallback(
    (patientUserId: string) => currentBlister?.members.find((member) => member.userId === patientUserId) ?? null,
    [currentBlister],
  );

  if (!blisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  if (!blistersLoaded && blisters.length === 0) {
    return (
      <div className="c-treatments-page__list" aria-busy="true">
        <Skeleton height="6rem" />
        <Skeleton height="6rem" />
        <Skeleton height="6rem" />
      </div>
    );
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

  return (
    <section className="c-treatments-page" aria-label="Listado de tratamientos">
      {blisters.length > 0 ? (
        <BlisterPillSelector
          blisters={blisters}
          activeBlisterId={blisterId}
          onCreate={() => navigate(ROUTES.createBlister)}
          onSelect={(blister) => {
            const role = userId
              ? (blister.members.find((member) => member.userId === userId)?.role ?? null)
              : null;
            setActiveBlister(blister._id, role);
            navigate(ROUTES.blisterTreatments(blister._id));
          }}
        />
      ) : null}

      {error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="c-treatments-page__list" aria-busy="true">
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
        </div>
      ) : visible.length === 0 ? (
        <div className="c-treatments-page__list">
          <EmptyState
            title="Aún no tienes tratamientos"
            description={
              canMutate
                ? 'Crea uno para vincular medicamentos con dosis y frecuencia.'
                : 'Pide al administrador del blíster que cree tratamientos.'
            }
          />
          {canMutate ? (
            <button
              type="button"
              className="c-treatments-page__new-card"
              onClick={() => navigate(ROUTES.newTreatment(blisterId))}
            >
              <span className="c-treatments-page__new-icon" aria-hidden="true">+</span>
              <span>Nuevo tratamiento</span>
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="c-treatments-page__list">
          {visible.map((treatment) => (
            <li key={treatment.id} className="c-treatments-page__item">
              <TreatmentRow
                treatment={treatment}
                medicines={medicines}
                blisterId={blisterId}
                blisterName={currentBlister?.name ?? 'Blíster'}
                patientName={getPatient(treatment.patientUserId)?.fullName?.trim() || getPatient(treatment.patientUserId)?.username?.trim() || 'Paciente'}
                patientAvatarKey={getPatient(treatment.patientUserId)?.avatarKey ?? null}
                userRole={role}
                onDelete={handleDelete}
              />
            </li>
          ))}
          {canMutate ? (
            <li className="c-treatments-page__item">
              <button
                type="button"
                className="c-treatments-page__new-card"
                onClick={() => navigate(ROUTES.newTreatment(blisterId))}
              >
                <span className="c-treatments-page__new-icon" aria-hidden="true">+</span>
                <span>Nuevo tratamiento</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}

    </section>
  );
}

export default TreatmentsPage;
