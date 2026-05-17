import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';
import { TbCalendarEvent, TbClock, TbMapPin, TbNotes, TbStethoscope, TbUserHeart } from 'react-icons/tb';

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
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

interface FormValues {
  patientUserId: string;
  title: string;
  location: string;
  description: string;
  date: string;
  treatmentId: string;
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

function toLocalDateTime(value: string): Date {
  const [datePart = '', timePart = ''] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function buildPayload(values: FormValues): CreateAppointmentInput {
  return createAppointmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    location: toNullableText(values.location),
    description: toNullableText(values.description),
    date: toLocalDateTime(values.date),
    treatmentId: values.treatmentId ? values.treatmentId : null,
  });
}

function getAppointmentIssueMessage(path: string, message: string): string {
  if (path === 'patientUserId') return 'Selecciona un miembro del blíster.';
  if (path === 'treatmentId') return 'Selecciona un tratamiento válido.';
  return message;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function AppointmentFormPage() {
  const navigate = useNavigate();
  const { blisterId: routeBlisterId, appointmentId } = useParams<{ blisterId: string; appointmentId?: string }>();
  const isEditing = Boolean(appointmentId);
  usePageTitle(isEditing ? 'Editar cita' : 'Nueva cita');
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const addToast = useUiStore((s) => s.addToast);

  const { appointments, isLoading, error, refetch, createAppointment, updateAppointment } =
    useAppointments(blisterId);
  const { treatments } = useTreatments(blisterId);

  const target = useMemo(
    () => (appointmentId ? appointments.find((a) => a.id === appointmentId) ?? null : null),
    [appointments, appointmentId],
  );
  const activeBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const role = useMemo(
    () => activeBlister?.members.find((member) => member.userId === userId)?.role
      ?? (blisterId === activeBlisterId ? activeRole : null),
    [activeBlister, activeBlisterId, activeRole, blisterId, userId],
  );
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';
  const defaultPatientUserId = useMemo(
    () => activeBlister?.members.find((member) => member.userId === userId)?.userId
      ?? activeBlister?.members[0]?.userId
      ?? '',
    [activeBlister, userId],
  );

  const form = useForm<FormValues>({
    defaultValues: {
      patientUserId: defaultPatientUserId,
      title: '',
      location: '',
      description: '',
      date: '',
      treatmentId: '',
    },
  });
  const { register, handleSubmit, reset, setError, control, formState } = form;
  const selectedPatientUserId = useWatch({ control, name: 'patientUserId' });
  const linkedTreatments = useMemo(
    () => treatments.filter((treatment) => !selectedPatientUserId || treatment.patientUserId === selectedPatientUserId),
    [selectedPatientUserId, treatments],
  );

  useEffect(() => {
    if (target) {
      reset({
        patientUserId: target.patientUserId,
        title: target.title,
        location: target.location ?? '',
        description: target.description ?? '',
        date: toLocalDateTimeInput(target.date),
        treatmentId: target.treatmentId ?? '',
      });
    }
  }, [target, reset]);

  useEffect(() => {
    if (!isEditing && defaultPatientUserId) {
      reset({
        patientUserId: defaultPatientUserId,
        title: '',
        location: '',
        description: '',
        date: '',
        treatmentId: '',
      });
    }
  }, [defaultPatientUserId, isEditing, reset]);

  if (!blisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }
  if (!blistersLoaded && blisters.length === 0) {
    return (
      <section className="c-appointment-form-page" aria-busy="true">
        <Skeleton height="2rem" />
        <Skeleton height="3rem" />
      </section>
    );
  }
  if (!canMutate) {
    return <Navigate to={ROUTES.blisterAppointments(blisterId)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    let payload: CreateAppointmentInput;
    try {
      payload = buildPayload(values);
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (path) setError(path as never, { message: getAppointmentIssueMessage(path, issue.message) });
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
      navigate(ROUTES.blisterAppointments(blisterId));
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
        <FormSection label="Paciente" icon={<TbUserHeart />}>
          <label className="c-field">
            <span className="c-field__label">
              <span className="c-field__label-text">Miembro del blíster</span>
            </span>
            <select className="c-field__select" {...register('patientUserId')}>
              <option value="">Selecciona…</option>
              {activeBlister?.members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName?.trim() || member.username?.trim() || 'Miembro del blíster'}
                </option>
              ))}
            </select>
            {formState.errors.patientUserId?.message ? (
              <span className="c-field__error">{formState.errors.patientUserId.message}</span>
            ) : null}
          </label>
        </FormSection>

        <FormSection label="Título de la cita" icon={<TbCalendarEvent />}>
          <Input
            label="Título"
            maxLength={200}
            placeholder="Ej. Revisión médico de cabecera"
            error={formState.errors.title?.message}
            {...register('title')}
          />
        </FormSection>

        <FormSection label="Lugar" icon={<TbMapPin />}>
          <Input
            label="Centro o consulta"
            maxLength={200}
            placeholder="Ej. Centro de salud, planta 2"
            error={formState.errors.location?.message}
            {...register('location')}
          />
        </FormSection>

        <FormSection label="Descripción" icon={<TbNotes />}>
          <label className={['c-field', formState.errors.description && 'c-field--error'].filter(Boolean).join(' ')}>
            <span className="c-field__label">
              <span className="c-field__label-text">Notas de la cita</span>
            </span>
            <textarea
              className="c-field__textarea"
              rows={4}
              maxLength={600}
              placeholder="Motivo, pruebas pendientes o indicaciones"
              {...register('description')}
            />
            {formState.errors.description?.message ? (
              <span className="c-field__error">{formState.errors.description.message}</span>
            ) : null}
          </label>
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
              {linkedTreatments.map((t) => (
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
