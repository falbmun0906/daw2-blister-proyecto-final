import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';
import { TbCalendarEvent, TbClock, TbStethoscope } from 'react-icons/tb';

import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from '../../../../shared/schemas/appointment.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { useAppointments } from '../../hooks/use.appointments';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './AppointmentFormPage.scss';

interface FormValues {
  title: string;
  date: string;
  treatmentId: string;
}

function buildPayload(values: FormValues): CreateAppointmentInput {
  return createAppointmentSchema.parse({
    title: values.title,
    date: values.date,
    treatmentId: values.treatmentId ? values.treatmentId : undefined,
  });
}

function AppointmentFormPage() {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const isEditing = Boolean(appointmentId);
  usePageTitle(isEditing ? 'Editar cita' : 'Nueva cita');
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';
  const addToast = useUiStore((s) => s.addToast);

  const { appointments, isLoading, error, refetch, createAppointment, updateAppointment } =
    useAppointments();
  const { treatments } = useTreatments();

  const target = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) ?? null : null),
    [appointments, appointmentId],
  );

  const form = useForm<FormValues>({
    defaultValues: { title: '', date: '', treatmentId: '' },
  });
  const { register, handleSubmit, reset, setError, formState } = form;

  useEffect(() => {
    if (target) {
      reset({
        title: target.title,
        date: target.date.slice(0, 16),
        treatmentId: target.treatmentId ?? '',
      });
    }
  }, [target, reset]);

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }
  if (!canMutate) {
    return <Navigate to={ROUTES.blisterAppointments(activeBlisterId)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    let payload: CreateAppointmentInput;
    try {
      payload = buildPayload(values);
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (path) setError(path as never, { message: issue.message });
        }
        return;
      }
      throw err;
    }
    try {
      if (isEditing && appointmentId) {
        await updateAppointment(appointmentId, payload);
        addToast({ message: 'Cita actualizada.', variant: 'success' });
      } else {
        await createAppointment(payload);
        addToast({ message: 'Cita creada.', variant: 'success' });
      }
      navigate(ROUTES.blisterAppointments(activeBlisterId));
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido guardar la cita.';
      addToast({ message, variant: 'error' });
    }
  });

  if (isEditing && isLoading && !target) {
    return (
      <section className="c-appointment-form-page" aria-busy="true">
        <Skeleton height="2rem" />
        <Skeleton height="3rem" />
      </section>
    );
  }

  if (isEditing && !target && !isLoading) {
    return (
      <section className="c-appointment-form-page">
        <ErrorState message={error ?? 'Cita no encontrada.'} onRetry={() => void refetch()} />
      </section>
    );
  }

  return (
    <section className="c-appointment-form-page" aria-label={isEditing ? 'Editar cita' : 'Nueva cita'}>
      <form className="c-appointment-form-page__form" onSubmit={onSubmit} noValidate>
        <FormSection label="Título de la cita" icon={<TbCalendarEvent />}>
          <Input
            label="Título"
            maxLength={200}
            placeholder="Ej. Revisión médico de cabecera"
            error={formState.errors.title?.message}
            {...register('title')}
          />
        </FormSection>

        <FormSection label="Fecha y hora" icon={<TbClock />}>
          <Input
            type="datetime-local"
            label="Cuándo"
            error={formState.errors.date?.message}
            {...register('date')}
          />
        </FormSection>

        <FormSection
          label="Tratamiento vinculado"
          hint="Opcional: asocia la cita a un tratamiento existente."
          icon={<TbStethoscope />}
        >
          <label className="c-field">
            <span className="c-field__label">
              <span className="c-field__label-text">Tratamiento</span>
            </span>
            <select className="c-field__select" {...register('treatmentId')}>
              <option value="">Sin vincular</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <Button variant="primary" fullWidth type="submit" loading={formState.isSubmitting}>
          {isEditing ? 'Guardar cambios' : 'Crear cita'}
        </Button>
      </form>
    </section>
  );
}

export default AppointmentFormPage;
