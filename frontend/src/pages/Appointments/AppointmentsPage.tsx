import { Navigate, useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { AppointmentCard } from '../../components/organisms/AppointmentCard';
import { ROUTES } from '../../constants/routes';
import { useAppointments } from '../../hooks/use.appointments';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Appointment } from '../../types/appointment.types';
import './AppointmentsPage.scss';

function AppointmentsPage() {
  usePageTitle('Calendario');
  const navigate = useNavigate();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const addToast = useUiStore((s) => s.addToast);
  const { appointments, isLoading, error, refetch, removeAppointment } = useAppointments();
  const { treatments } = useTreatments();

  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const handleDelete = async (appointment: Appointment): Promise<void> => {
    if (!window.confirm(`¿Eliminar la cita "${appointment.title}"?`)) return;
    try {
      await removeAppointment(appointment.id);
      addToast({ message: 'Cita eliminada.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido eliminar la cita.';
      addToast({ message, variant: 'error' });
    }
  };

  return (
    <section className="c-appointments-page" aria-label="Listado de citas">
      <header className="c-appointments-page__header">
        {canMutate ? (
          <Button variant="primary" onClick={() => navigate(ROUTES.newAppointment(activeBlisterId))}>
            Nueva cita
          </Button>
        ) : null}
      </header>

      {error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="c-appointments-page__list" aria-busy="true">
          <Skeleton height="5rem" />
          <Skeleton height="5rem" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Sin citas próximas"
          description={
            canMutate
              ? 'Añade una cita para no olvidar visitas y revisiones.'
              : 'Pide al administrador del blíster que añada citas.'
          }
          ctaLabel={canMutate ? 'Nueva cita' : undefined}
          onCtaClick={canMutate ? () => navigate(ROUTES.newAppointment(activeBlisterId)) : undefined}
        />
      ) : (
        <ul className="c-appointments-page__list">
          {sorted.map((appointment) => (
            <li key={appointment.id} className="c-appointments-page__item">
              <AppointmentCard
                appointment={appointment}
                treatments={treatments}
                blisterId={activeBlisterId}
                userRole={activeRole}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AppointmentsPage;
