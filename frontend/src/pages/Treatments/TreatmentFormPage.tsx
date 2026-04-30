import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';
import { TbCalendar, TbPill, TbStethoscope, TbToggleRight, TbUserHeart } from 'react-icons/tb';

import {
  createTreatmentSchema,
  type CreateTreatmentInput,
} from '../../../../shared/schemas/treatment.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './TreatmentFormPage.scss';

interface FormValues {
  patientUserId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  medicines: { medicineId: string; amount: number; frequencyHours: number; note: string }[];
}

function toFormValues(
  treatment: ReturnType<typeof useTreatments>['treatments'][number] | null,
  fallbackPatientUserId = '',
): FormValues {
  if (!treatment) {
    return {
      patientUserId: fallbackPatientUserId,
      title: '',
      description: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      active: true,
      medicines: [{ medicineId: '', amount: 1, frequencyHours: 8, note: '' }],
    };
  }
  return {
    patientUserId: treatment.patientUserId,
    title: treatment.title,
    description: treatment.description ?? '',
    startDate: treatment.startDate.slice(0, 10),
    endDate: treatment.endDate ? treatment.endDate.slice(0, 10) : '',
    active: treatment.active,
    medicines: treatment.medicines.map((entry) => ({
      medicineId: entry.medicineId,
      amount: entry.amount,
      frequencyHours: entry.frequencyHours,
      note: entry.note ?? '',
    })),
  };
}

function buildPayload(values: FormValues): CreateTreatmentInput {
  return createTreatmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    description: values.description || undefined,
    startDate: values.startDate,
    endDate: values.endDate ? values.endDate : undefined,
    active: values.active,
    medicines: values.medicines.map((entry) => ({
      ...entry,
      note: entry.note || undefined,
    })),
  });
}

function TreatmentFormPage() {
  usePageTitle('Tratamiento');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId, treatmentId } = useParams<{ blisterId: string; treatmentId?: string }>();
  const isEditing = Boolean(treatmentId);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const addToast = useUiStore((s) => s.addToast);

  const { treatments, isLoading, error, refetch, createTreatment, updateTreatment } = useTreatments(blisterId);
  const { medicines, isLoading: medsLoading } = useMedicines(blisterId);

  const target = useMemo(
    () => (treatmentId ? treatments.find((t) => t.id === treatmentId) ?? null : null),
    [treatments, treatmentId],
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
    defaultValues: toFormValues(null, defaultPatientUserId),
  });
  const { register, handleSubmit, control, reset, setError, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });

  useEffect(() => {
    if (target) reset(toFormValues(target, defaultPatientUserId));
  }, [defaultPatientUserId, target, reset]);

  useEffect(() => {
    if (!isEditing && defaultPatientUserId) reset(toFormValues(null, defaultPatientUserId));
  }, [defaultPatientUserId, isEditing, reset]);

  if (!blisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }
  if (!blistersLoaded && blisters.length === 0) {
    return (
      <section className="c-treatment-form-page" aria-busy="true">
        <Skeleton height="2rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </section>
    );
  }
  if (!canMutate) {
    return <Navigate to={ROUTES.blisterTreatments(blisterId)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    let payload: CreateTreatmentInput;
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
      if (isEditing && treatmentId) {
        await updateTreatment(treatmentId, payload);
        addToast({ message: 'Tratamiento actualizado.', variant: 'success' });
      } else {
        await createTreatment(payload);
        addToast({ message: 'Tratamiento creado.', variant: 'success' });
      }
      navigate(ROUTES.blisterTreatments(blisterId));
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido guardar el tratamiento.';
      addToast({ message, variant: 'error' });
    }
  });

  if (isEditing && isLoading && !target) {
    return (
      <section className="c-treatment-form-page" aria-busy="true">
        <Skeleton height="2rem" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </section>
    );
  }

  if (isEditing && !target && !isLoading) {
    return (
      <section className="c-treatment-form-page">
        <ErrorState message={error ?? 'Tratamiento no encontrado.'} onRetry={() => void refetch()} />
      </section>
    );
  }

  return (
    <section className="c-treatment-form-page" aria-labelledby="treatment-form-title">
      <form className="c-treatment-form-page__form" onSubmit={onSubmit} noValidate>
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

        <FormSection label="Título del tratamiento" icon={<TbStethoscope />}>
          <Input
            label="Título"
            maxLength={200}
            placeholder="Ej. Antibiótico amoxicilina"
            error={formState.errors.title?.message}
            {...register('title')}
          />
          <label className="c-field">
            <span className="c-field__label">
              <span className="c-field__label-text">Descripción</span>
            </span>
            <textarea
              className="c-field__textarea"
              maxLength={600}
              rows={4}
              placeholder="Motivo, indicaciones o contexto clínico"
              {...register('description')}
            />
          </label>
        </FormSection>

        <FormSection label="Duración" icon={<TbCalendar />}>
          <Input
            type="date"
            label="Inicio"
            error={formState.errors.startDate?.message}
            {...register('startDate')}
          />
          <Input
            type="date"
            label="Fin (opcional)"
            error={formState.errors.endDate?.message}
            {...register('endDate')}
          />
        </FormSection>

        <FormSection
          label="Medicamentos"
          hint="Configura cantidad y frecuencia de cada toma."
          icon={<TbPill />}
        >
          {medsLoading ? <Skeleton height="2rem" /> : null}
          {fields.map((field, index) => (
            <div key={field.id} className="c-treatment-form-page__med-row">
              <label className="c-field">
                <span className="c-field__label">
                  <span className="c-field__label-text">Medicamento</span>
                </span>
                <select
                  className="c-field__select"
                  {...register(`medicines.${index}.medicineId` as const)}
                >
                  <option value="">Selecciona…</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.alias?.trim() || m.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                type="number"
                label="Cantidad"
                min={1}
                {...register(`medicines.${index}.amount` as const, { valueAsNumber: true })}
              />
              <Input
                type="number"
                label="Frecuencia (h)"
                min={1}
                {...register(`medicines.${index}.frequencyHours` as const, { valueAsNumber: true })}
              />
              <label className="c-field c-treatment-form-page__med-note">
                <span className="c-field__label">
                  <span className="c-field__label-text">Nota</span>
                </span>
                <textarea
                  className="c-field__textarea"
                  maxLength={300}
                  rows={3}
                  placeholder="Ej. Tomar con comida"
                  {...register(`medicines.${index}.note` as const)}
                />
              </label>
              {fields.length > 1 ? (
                <Button variant="ghost" type="button" onClick={() => remove(index)}>
                  Quitar
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            variant="primary-outline"
            type="button"
            onClick={() => append({ medicineId: '', amount: 1, frequencyHours: 8, note: '' })}
          >
            Añadir medicamento
          </Button>
        </FormSection>

        <FormSection label="Estado" icon={<TbToggleRight />}>
          <label className="c-treatment-form-page__active">
            <input type="checkbox" {...register('active')} />
            <span className="c-treatment-form-page__active-control" aria-hidden="true" />
            <span className="c-treatment-form-page__active-copy">
              <span>Tratamiento activo</span>
              <small>Las próximas tomas se mostrarán en Inicio y Calendario.</small>
            </span>
          </label>
        </FormSection>

        <Button variant="primary" fullWidth type="submit" loading={formState.isSubmitting}>
          {isEditing ? 'Guardar cambios' : 'Crear tratamiento'}
        </Button>
      </form>
    </section>
  );
}

export default TreatmentFormPage;
