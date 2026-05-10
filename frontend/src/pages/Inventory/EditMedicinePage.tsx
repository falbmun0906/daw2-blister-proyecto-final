import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TbCalendar, TbNumbers, TbTag } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Stepper } from '../../components/atoms/Stepper';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { useRefreshNotifications } from '../../hooks/use.notifications';
import { getMedicine, removeMedicine, updateMedicine } from '../../services/medicines.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Medicine } from '../../types/medicine.types';
import './AddMedicinePage.scss';

const formSchema = z.object({
  alias: z.string().trim().max(100).optional(),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo.').refine(
    (value) => Number.isInteger(value * 2),
    'El stock debe ir en incrementos de 0,5.',
  ),
  threshold: z.coerce.number().min(0, 'El umbral no puede ser negativo.').refine(
    (value) => Number.isInteger(value * 2),
    'El umbral debe ir en incrementos de 0,5.',
  ),
  expDate: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function EditMedicinePage() {
  usePageTitle('Editar medicamento');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId, medicineId } = useParams<{ blisterId: string; medicineId: string }>();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const upsertMedicine = useMedicinesStore((s) => s.upsertMedicine);
  const removeFromStore = useMedicinesStore((s) => s.removeMedicine);
  const addToast = useUiStore((s) => s.addToast);
  const refreshNotifications = useRefreshNotifications();

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const routeRole = blisters
    .find((blister) => blister._id === blisterId)
    ?.members.find((member) => member.userId === userId)
    ?.role ?? null;

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { alias: '', stock: 0, threshold: 0, expDate: '' },
  });

  useEffect(() => {
    if (!blisterId || !medicineId) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoadError(null);
      getMedicine(blisterId, medicineId)
        .then((m) => {
          if (cancelled) return;
          if (!m) {
            setLoadError('Medicamento no encontrado.');
            return;
          }
          setMedicine(m);
          reset({
            alias: m.alias ?? '',
            stock: m.stock,
            threshold: m.threshold,
            expDate: toDateInputValue(m.expDate),
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(isApiError(err) ? err.message : 'No se ha podido cargar el medicamento.');
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [blisterId, medicineId, reset]);

  if (!blisterId) return <Navigate to={ROUTES.blisters} replace />;
  const role = routeRole ?? activeRole;
  if (role !== 'OWNER' && role !== 'CAREGIVER') {
    return <Navigate to={ROUTES.blisterMedications(blisterId)} replace />;
  }
  if (!medicineId) return <Navigate to={ROUTES.blisterMedications(blisterId)} replace />;

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);

    try {
      const updated = await updateMedicine(blisterId, medicineId, {
        alias: data.alias || undefined,
        stock: data.stock,
        threshold: data.threshold,
        expDate: data.expDate ? new Date(data.expDate) : undefined,
      });
      upsertMedicine(updated);
      await refreshNotifications();
      addToast({ message: 'Medicamento actualizado.', variant: 'success' });
      navigate(ROUTES.medicineDetail(blisterId, medicineId));
    } catch (err) {
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido actualizar.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este medicamento del botiquín?')) return;
    setDeleting(true);
    try {
      await removeMedicine(blisterId, medicineId);
      removeFromStore(medicineId);
      addToast({ message: 'Medicamento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterMedications(blisterId));
    } catch (err) {
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido eliminar.');
      setDeleting(false);
    }
  };

  return (
    <section className="c-add-medicine-page" aria-label="Editar medicamento">
      {loadError ? (
        <ErrorState message={loadError} />
      ) : !medicine ? (
        <div aria-busy="true">
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      ) : (
        <form className="c-add-medicine-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="c-add-medicine-page__selected">
            <p className="c-add-medicine-page__selected-name">{medicine.nombre}</p>
            <p className="c-add-medicine-page__selected-meta">{medicine.pactivos}</p>
          </div>
          {submitError ? <ErrorState message={submitError} /> : null}

          <FormSection
            label="Alias del medicamento"
            hint="Un nombre corto que solo verás tú (opcional)."
            icon={<TbTag />}
          >
            <Input
              label="Alias"
              type="text"
              {...register('alias')}
              error={errors.alias?.message}
            />
          </FormSection>

          <FormSection label="Fecha de caducidad" icon={<TbCalendar />}>
            <Input
              label="Fecha"
              type="date"
              {...register('expDate')}
              error={errors.expDate?.message}
            />
          </FormSection>

          <FormSection
            label="Cantidad disponible"
            hint="Te avisaremos cuando baje del umbral."
            icon={<TbNumbers />}
          >
            <Controller
              control={control}
              name="stock"
              render={({ field, fieldState }) => (
                <Stepper
                  label="Stock"
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  step={0.5}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="threshold"
              render={({ field, fieldState }) => (
                <Stepper
                  label="Umbral de aviso"
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  step={0.5}
                  error={fieldState.error?.message}
                />
              )}
            />
          </FormSection>

          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Guardar cambios
          </Button>
          <Button type="button" variant="danger" fullWidth onClick={handleDelete} loading={deleting}>
            Eliminar del botiquín
          </Button>
        </form>
      )}
    </section>
  );
}

export default EditMedicinePage;
