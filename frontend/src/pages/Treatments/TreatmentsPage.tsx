import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { TreatmentRow } from '../../components/organisms/TreatmentRow';
import { ROUTES } from '../../constants/routes';
import { useAppointments } from '../../hooks/use.appointments';
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';

function TreatmentsPage() {
  usePageTitle('Tratamientos');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const activeRole = useBlisterStore((state) => state.activeRole);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const { treatments, isLoading, error, refetch } = useTreatments(blisterId);
  const { appointments } = useAppointments(blisterId);

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
  const getAppointmentCount = useCallback(
    (treatmentId: string) => appointments.filter((appointment) => appointment.treatmentId === treatmentId).length,
    [appointments],
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

  return (
    <section className="c-treatments-page" aria-label="Listado de tratamientos">
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
                blisterId={blisterId}
                patientName={getPatient(treatment.patientUserId)?.fullName?.trim() || getPatient(treatment.patientUserId)?.username?.trim() || 'Paciente'}
                patientAvatarKey={getPatient(treatment.patientUserId)?.avatarKey ?? null}
                appointmentsCount={getAppointmentCount(treatment.id)}
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
