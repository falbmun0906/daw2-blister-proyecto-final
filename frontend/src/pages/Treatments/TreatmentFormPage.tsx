import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';

import {
  createTreatmentSchema,
  type CreateTreatmentInput,
} from '../../../../shared/schemas/treatment.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ROUTES } from '../../constants/routes';
import { useMedicines } from '../../hooks/use.medicines';
import { useTreatments } from '../../hooks/use.treatments';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './TreatmentFormPage.scss';

interface FormValues {
  title: string;
  startDate: string;
  endDate: string;
  active: boolean;
  medicines: { medicineId: string; amount: number; frequency: number }[];
}

function toFormValues(treatment: ReturnType<typeof useTreatments>['treatments'][number] | null): FormValues {
  if (!treatment) {
    return {
      title: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      active: true,
      medicines: [{ medicineId: '', amount: 1, frequency: 8 }],
    };
  }
  return {
    title: treatment.title,
    startDate: treatment.startDate.slice(0, 10),
    endDate: treatment.endDate ? treatment.endDate.slice(0, 10) : '',
    active: treatment.active,
    medicines: treatment.medicines,
  };
}

function buildPayload(values: FormValues): CreateTreatmentInput {
  return createTreatmentSchema.parse({
    title: values.title,
    startDate: values.startDate,
    endDate: values.endDate ? values.endDate : undefined,
    active: values.active,
    medicines: values.medicines,
  });
}

function TreatmentFormPage() {
  const navigate = useNavigate();
  const { treatmentId } = useParams<{ treatmentId?: string }>();
  const isEditing = Boolean(treatmentId);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';
  const addToast = useUiStore((s) => s.addToast);

  const { treatments, isLoading, error, refetch, createTreatment, updateTreatment } = useTreatments();
  const { medicines, isLoading: medsLoading } = useMedicines();

  const target = useMemo(
    () => (treatmentId ? treatments.find((t) => t.id === treatmentId) ?? null : null),
    [treatments, treatmentId],
  );

  const form = useForm<FormValues>({
    defaultValues: toFormValues(null),
  });
  const { register, handleSubmit, control, reset, setError, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });

  useEffect(() => {
    if (target) reset(toFormValues(target));
  }, [target, reset]);

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }
  if (!canMutate) {
    return <Navigate to={ROUTES.blisterTreatments(activeBlisterId)} replace />;
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
      navigate(ROUTES.blisterTreatments(activeBlisterId));
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
      <header className="c-treatment-form-page__header">
        <button
          type="button"
          className="c-treatment-form-page__back"
          aria-label="Volver"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h1 id="treatment-form-title" className="c-treatment-form-page__title">
          {isEditing ? 'Editar tratamiento' : 'Nuevo tratamiento'}
        </h1>
        <span aria-hidden="true" />
      </header>

      <form className="c-treatment-form-page__form" onSubmit={onSubmit} noValidate>
        <Input
          label="Título"
          maxLength={200}
          error={formState.errors.title?.message}
          {...register('title')}
        />
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

        <fieldset className="c-treatment-form-page__meds">
          <legend>Medicamentos</legend>
          {medsLoading ? <Skeleton height="2rem" /> : null}
          {fields.map((field, index) => (
            <div key={field.id} className="c-treatment-form-page__med-row">
              <label className="c-treatment-form-page__med-label">
                <span>Medicamento</span>
                <select
                  className="c-treatment-form-page__select"
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
                {...register(`medicines.${index}.frequency` as const, { valueAsNumber: true })}
              />
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
            onClick={() => append({ medicineId: '', amount: 1, frequency: 8 })}
          >
            Añadir medicamento
          </Button>
        </fieldset>

        <label className="c-treatment-form-page__active">
          <input type="checkbox" {...register('active')} />
          <span>Activo</span>
        </label>

        <Button variant="primary" fullWidth type="submit" loading={formState.isSubmitting}>
          {isEditing ? 'Guardar cambios' : 'Crear tratamiento'}
        </Button>
      </form>
    </section>
  );
}

export default TreatmentFormPage;
