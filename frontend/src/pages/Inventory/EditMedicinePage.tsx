import { useEffect, useState } from 'react';
import { useMutationContext } from '../../hooks/use.mutation-context';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { TbCalendar, TbNumbers, TbTag } from 'react-icons/tb';

import type { UpdateMedicineInput } from '../../../../shared/schemas/medicine.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Stepper } from '../../components/atoms/Stepper';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { useRefreshNotifications } from '../../hooks/use.notifications';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { getMedicine, removeMedicine, updateMedicine } from '../../services/medicines.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Medicine } from '../../types/medicine.types';
import { CustomMedicineForm } from '../../components/organisms/CustomMedicineForm';

const formSchema = z.object({
  alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
  stock: z.coerce
    .number()
    .min(0, 'El stock no puede ser negativo.')
    .refine((value) => Number.isInteger(value * 2), 'El stock debe ir en incrementos de 0,5.'),
  threshold: z.coerce
    .number()
    .min(0, 'El umbral no puede ser negativo.')
    .refine((value) => Number.isInteger(value * 2), 'El umbral debe ir en incrementos de 0,5.'),
  expDate: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function EditMedicinePage() {
  const location = useLocation();
  return <EditMedicineContent key={location.key} />;
}

function EditMedicineContent() {
  usePageTitle('Editar medicamento');
  const navigate = useNavigate();
  const captureMutation = useMutationContext();
  const { blisterId: routeBlisterId, medicineId } = useParams<{
    blisterId: string;
    medicineId: string;
  }>();
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const routeRole =
    blisters
      .find((blister) => blister._id === blisterId)
      ?.members.find((member) => member.userId === userId)?.role ?? null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: createZodFormResolver(formSchema),
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
    const isCurrent = captureMutation();
    setSubmitError(null);

    try {
      const payload: UpdateMedicineInput = {
        alias: data.alias ?? '',
        stock: data.stock,
        threshold: data.threshold,
      };
      const currentExpDate = medicine ? toDateInputValue(medicine.expDate) : '';
      if (data.expDate && data.expDate !== currentExpDate) {
        payload.expDate = new Date(data.expDate);
      }

      const updated = await updateMedicine(blisterId, medicineId, payload);
      if (!isCurrent()) return;
      upsertMedicine(updated);
      await refreshNotifications();
      if (!isCurrent()) return;
      addToast({ message: 'Medicamento actualizado.', variant: 'success' });
      navigate(ROUTES.medicineDetail(blisterId, medicineId));
    } catch (err) {
      if (!isCurrent()) return;
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido actualizar.');
    }
  };

  const handleDelete = async () => {
    const isCurrent = captureMutation();
    setDeleting(true);
    try {
      await removeMedicine(blisterId, medicineId);
      if (!isCurrent()) return;
      removeFromStore(medicineId);
      addToast({ message: 'Medicamento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterMedications(blisterId));
    } catch (err) {
      if (!isCurrent()) return;
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
      ) : medicine.source === 'custom' ? (
        <>
          <CustomMedicineForm
            key={medicine._id}
            initial={medicine}
            onSave={async (input) => {
              const isCurrent = captureMutation();
              const expiryChanged =
                (input.expDate?.toISOString().slice(0, 10) ?? '') !==
                toDateInputValue(medicine.expDate);
              const updated = await updateMedicine(blisterId, medicineId, {
                nombre: input.nombre,
                customDetails: input.customDetails,
                alias: input.alias,
                stock: input.stock,
                threshold: input.threshold,
                ...(expiryChanged ? { expDate: input.expDate } : {}),
              });
              if (!isCurrent()) return;
              upsertMedicine(updated);
              await refreshNotifications();
              if (!isCurrent()) return;
              addToast({ message: 'Producto actualizado.', variant: 'success' });
              navigate(ROUTES.medicineDetail(blisterId, medicineId));
            }}
          />
          {role === 'OWNER' ? (
            <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)} loading={deleting}>
              Eliminar del botiquín
            </Button>
          ) : null}
          {submitError ? <ErrorState message={submitError} /> : null}
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Eliminar producto"
            message="Se conservará el histórico. Si tiene un tratamiento activo, primero debes editar o finalizar esa pauta."
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={handleDelete}
            ariaLabel="Confirmar eliminación del producto"
          />
        </>
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
            <Input label="Alias" type="text" {...register('alias')} error={errors.alias?.message} />
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
          <Button
            type="button"
            variant="danger"
            fullWidth
            onClick={() => setConfirmDeleteOpen(true)}
            loading={deleting}
          >
            Eliminar del botiquín
          </Button>
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Eliminar medicamento"
            message="¿Eliminar este medicamento del botiquín? Se ocultará del inventario y se conservará el histórico. Si está en un tratamiento activo, primero tendrás que editar o finalizar esa pauta."
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={handleDelete}
            ariaLabel="Confirmar eliminación del medicamento"
          />
        </form>
      )}
    </section>
  );
}

export default EditMedicinePage;
