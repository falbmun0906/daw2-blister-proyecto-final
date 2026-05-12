import { useEffect, useMemo } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';
import { TbCalendar, TbClock, TbPill, TbStethoscope, TbToggleRight, TbUserHeart } from 'react-icons/tb';

import {
  createTreatmentSchema,
  type CreateTreatmentInput,
  type Treatment,
  updateTreatmentSchema,
  type UpdateTreatmentInput,
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

interface FormValues {
  patientUserId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  medicines: Array<{
    medicineId: string;
    amount: number;
    firstDoseTime: string;
    frequencyHours: number;
    scheduleType: 'interval' | 'daily_times';
    dailyDoseTimes: Array<{ time: string }>;
    isRecurring: boolean;
    note: string;
  }>;
}

interface TreatmentMedicineFieldsProps {
  index: number;
  medicines: ReturnType<typeof useMedicines>['medicines'];
  fieldCount: number;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  errors: FieldErrors<FormValues>;
  onRemove: (index: number) => void;
}

function toLocalParts(value: Date): { date: string; time: string } {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60 * 1000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  };
}

function defaultStartParts(): { date: string; time: string } {
  const now = new Date();
  return toLocalParts(now);
}

function toLocalDateTimeIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

const createTreatmentMedicine = (firstDoseTime = '08:00'): FormValues['medicines'][number] => ({
  medicineId: '',
  amount: 1,
  firstDoseTime,
  frequencyHours: 8,
  scheduleType: 'interval',
  dailyDoseTimes: [{ time: firstDoseTime }],
  isRecurring: true,
  note: '',
});

function normalizeDailyDoseTimes(entry: FormValues['medicines'][number]): string[] {
  return entry.dailyDoseTimes
    .map((item) => item.time.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function buildTreatmentMedicinePayload(
  entry: FormValues['medicines'][number],
  startDate: string,
) {
  const exactDailyTimes = normalizeDailyDoseTimes(entry);
  const firstDoseTime = entry.isRecurring && entry.scheduleType === 'daily_times'
    ? (exactDailyTimes[0] || entry.firstDoseTime || '08:00')
    : entry.firstDoseTime || exactDailyTimes[0] || '08:00';

  return {
    medicineId: entry.medicineId,
    amount: entry.amount,
    firstDoseAt: toLocalDateTimeIso(startDate, firstDoseTime),
    scheduleType: entry.isRecurring ? entry.scheduleType : 'interval',
    frequencyHours: entry.isRecurring && entry.scheduleType === 'interval' ? entry.frequencyHours : null,
    dailyDoseTimes: entry.isRecurring && entry.scheduleType === 'daily_times' ? exactDailyTimes : [],
    isRecurring: entry.isRecurring,
    note: entry.note || undefined,
  };
}

function buildCreatePayload(values: FormValues): CreateTreatmentInput {
  return createTreatmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    description: values.description || undefined,
    startDate: `${values.startDate}T00:00`,
    endDate: values.endDate ? `${values.endDate}T23:59` : undefined,
    active: values.active,
    medicines: values.medicines.map((entry) => buildTreatmentMedicinePayload(entry, values.startDate)),
  });
}

function buildUpdatePayload(values: FormValues): UpdateTreatmentInput {
  return updateTreatmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    description: values.description || undefined,
    startDate: `${values.startDate}T00:00`,
    endDate: values.endDate ? `${values.endDate}T23:59` : null,
    active: values.active,
    medicines: values.medicines.map((entry) => buildTreatmentMedicinePayload(entry, values.startDate)),
  });
}

function getMedicineSectionError(errors: FieldErrors<FormValues>): string | null {
  const rootMessage = (errors.medicines as { message?: string } | undefined)?.message;
  if (typeof rootMessage === 'string') {
    return rootMessage;
  }

  if (Array.isArray(errors.medicines) && errors.medicines.some((entry) => entry?.medicineId)) {
    return 'Selecciona al menos un medicamento antes de guardar el tratamiento.';
  }

  return null;
}

function TreatmentMedicineFields({
  index,
  medicines,
  fieldCount,
  register,
  control,
  setValue,
  errors,
  onRemove,
}: TreatmentMedicineFieldsProps) {
  const isRecurring = useWatch({ control, name: `medicines.${index}.isRecurring` as const }) ?? true;
  const scheduleType = useWatch({ control, name: `medicines.${index}.scheduleType` as const }) ?? 'interval';
  const firstDoseTime = useWatch({ control, name: `medicines.${index}.firstDoseTime` as const }) ?? '08:00';
  const { fields, append, remove } = useFieldArray({
    control,
    name: `medicines.${index}.dailyDoseTimes` as const,
  });
  const medicineErrors = errors.medicines?.[index];
  const dailyDoseTimesError = (medicineErrors?.dailyDoseTimes as { message?: string } | undefined)?.message;
  const dailyDoseTimeEntryErrors = medicineErrors?.dailyDoseTimes as Array<{ time?: { message?: string } }> | undefined;

  return (
    <div className="c-treatment-form-page__med-row">
      {fieldCount > 1 ? (
        <div className="c-treatment-form-page__med-row-header">
          <Button
            variant="danger"
            type="button"
            className="c-btn--sm"
            onClick={() => onRemove(index)}
          >
            Quitar
          </Button>
        </div>
      ) : null}

      <label className="c-field">
        <span className="c-field__label">
          <span className="c-field__label-text">Medicamento {index + 1}</span>
        </span>
        <select className="c-field__select" {...register(`medicines.${index}.medicineId` as const)}>
          <option value="">Selecciona…</option>
          {medicines.map((medicine) => (
            <option key={medicine._id} value={medicine._id}>
              {medicine.alias?.trim() || medicine.nombre}
            </option>
          ))}
        </select>
        {medicineErrors?.medicineId?.message ? (
          <span className="c-field__error">{medicineErrors.medicineId.message}</span>
        ) : null}
      </label>

      <label className="c-treatment-form-page__active c-treatment-form-page__active--compact">
        <input type="checkbox" {...register(`medicines.${index}.isRecurring` as const)} />
        <span className="c-treatment-form-page__active-control" aria-hidden="true" />
        <span className="c-treatment-form-page__active-copy">
          <span>Toma recurrente</span>
          <small>{isRecurring ? 'La pauta se repetirá según la configuración elegida.' : 'Solo se registrará una toma en la fecha de inicio.'}</small>
        </span>
      </label>

      <div className="c-treatment-form-page__schedule-box">
        {isRecurring ? (
          <>
            <p className="c-treatment-form-page__schedule-title">Tipo de pauta</p>
            <div className="c-treatment-form-page__schedule-toggle" role="tablist" aria-label={`Tipo de pauta del medicamento ${index + 1}`}>
              <button
                type="button"
                role="tab"
                aria-selected={scheduleType === 'interval'}
                className={['c-treatment-form-page__schedule-option', scheduleType === 'interval' && 'is-active'].filter(Boolean).join(' ')}
                onClick={() => setValue(`medicines.${index}.scheduleType`, 'interval', { shouldDirty: true })}
              >
                Intervalo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scheduleType === 'daily_times'}
                className={['c-treatment-form-page__schedule-option', scheduleType === 'daily_times' && 'is-active'].filter(Boolean).join(' ')}
                onClick={() => {
                  setValue(`medicines.${index}.scheduleType`, 'daily_times', { shouldDirty: true });
                  if (fields.length === 0) {
                    append({ time: firstDoseTime || '08:00' });
                  }
                }}
              >
                Horas exactas
              </button>
            </div>

            {scheduleType === 'interval' ? (
              <div className="c-treatment-form-page__schedule-fields">
                <Input
                  type="number"
                  label="Frecuencia (h)"
                  min={1}
                  step={1}
                  error={medicineErrors?.frequencyHours?.message}
                  {...register(`medicines.${index}.frequencyHours` as const, { valueAsNumber: true })}
                />
                <Input
                  type="time"
                  label="Hora de la primera toma"
                  icon={<TbClock aria-hidden="true" />}
                  wrapperClassName="c-treatment-form-page__time-field"
                  error={medicineErrors?.firstDoseTime?.message}
                  {...register(`medicines.${index}.firstDoseTime` as const)}
                />
              </div>
            ) : (
              <div className="c-treatment-form-page__time-list">
                {fields.map((field, timeIndex) => (
                  <div key={field.id} className="c-treatment-form-page__time-row">
                    <div className="c-treatment-form-page__time-input-wrap">
                      <Input
                        type="time"
                        label={`Hora ${timeIndex + 1}`}
                        icon={<TbClock aria-hidden="true" />}
                        wrapperClassName="c-treatment-form-page__time-field c-treatment-form-page__time-field--removable"
                        error={dailyDoseTimeEntryErrors?.[timeIndex]?.time?.message}
                        {...register(`medicines.${index}.dailyDoseTimes.${timeIndex}.time` as const)}
                      />
                      {fields.length > 1 ? (
                        <button
                          type="button"
                          className="c-treatment-form-page__time-remove"
                          onClick={() => remove(timeIndex)}
                          aria-label={`Quitar hora ${timeIndex + 1}`}
                        >
                          X
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {typeof dailyDoseTimesError === 'string' ? <span className="c-field__error">{dailyDoseTimesError}</span> : null}
                <Button
                  type="button"
                  variant="primary-outline"
                  onClick={() => append({ time: fields[fields.length - 1]?.time || firstDoseTime || '08:00' })}
                >
                  Añadir otra hora
                </Button>
              </div>
            )}
          </>
        ) : (
          <Input
            type="time"
            label="Hora de la toma"
            icon={<TbClock aria-hidden="true" />}
            wrapperClassName="c-treatment-form-page__time-field"
            error={medicineErrors?.firstDoseTime?.message}
            {...register(`medicines.${index}.firstDoseTime` as const)}
          />
        )}
      </div>

      <div className="c-treatment-form-page__med-grid">
        <Input
          type="number"
          label="Cantidad por toma"
          min={0.5}
          step={0.5}
          error={medicineErrors?.amount?.message}
          {...register(`medicines.${index}.amount` as const, { valueAsNumber: true })}
        />
      </div>

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
    </div>
  );
}

function toFormValues(
  treatment: ReturnType<typeof useTreatments>['treatments'][number] | null,
  fallbackPatientUserId = '',
): FormValues {
  if (!treatment) {
    const start = defaultStartParts();
    return {
      patientUserId: fallbackPatientUserId,
      title: '',
      description: '',
      startDate: start.date,
      endDate: '',
      active: true,
      medicines: [createTreatmentMedicine(start.time)],
    };
  }
  const start = toLocalParts(new Date(treatment.startDate));
  return {
    patientUserId: treatment.patientUserId,
    title: treatment.title,
    description: treatment.description ?? '',
    startDate: start.date,
    endDate: treatment.endDate ? treatment.endDate.slice(0, 10) : '',
    active: treatment.active,
    medicines: treatment.medicines.map((entry: Treatment['medicines'][number]) => ({
      medicineId: entry.medicineId,
      amount: entry.amount,
      firstDoseTime: toLocalParts(new Date(entry.firstDoseAt)).time,
      frequencyHours: entry.frequencyHours ?? 8,
      scheduleType: entry.scheduleType,
      dailyDoseTimes: (entry.dailyDoseTimes.length > 0
        ? entry.dailyDoseTimes
        : [toLocalParts(new Date(entry.firstDoseAt)).time]).map((time) => ({ time })),
      isRecurring: entry.isRecurring,
      note: entry.note ?? '',
    })),
  };
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
  const { register, handleSubmit, control, reset, setError, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });
  const medicineSectionError = getMedicineSectionError(formState.errors);

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
    try {
      if (isEditing && treatmentId) {
        const payload = buildUpdatePayload(values);
        await updateTreatment(treatmentId, payload);
        addToast({ message: 'Tratamiento actualizado.', variant: 'success' });
      } else {
        const payload = buildCreatePayload(values);
        await createTreatment(payload);
        addToast({ message: 'Tratamiento creado.', variant: 'success' });
      }
      navigate(ROUTES.blisterTreatments(blisterId));
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (path) setError(path as never, { message: issue.message });
        }
        return;
      }

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

        <FormSection label="Duración del tratamiento" icon={<TbCalendar />}>
          <Input
            type="date"
            label="Día de inicio"
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
          icon={<TbPill />}
        >
          {medsLoading ? <Skeleton height="2rem" /> : null}
          {medicineSectionError ? (
            <p className="c-treatment-form-page__section-error" role="status" aria-live="polite">
              {medicineSectionError}
            </p>
          ) : null}
          {fields.map((field, index) => (
            <TreatmentMedicineFields
              key={field.id}
              index={index}
              medicines={medicines}
              fieldCount={fields.length}
              register={register}
              control={control}
              setValue={setValue}
              errors={formState.errors}
              onRemove={remove}
            />
          ))}
          <Button
            variant="primary-outline"
            type="button"
            onClick={() => append(createTreatmentMedicine())}
          >
            Añadir otro medicamento
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
