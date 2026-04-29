import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { getMedicine, removeMedicine, updateMedicine } from '../../services/medicines.service';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Medicine } from '../../types/medicine.types';
import './AddMedicinePage.scss';

const formSchema = z.object({
  alias: z.string().trim().max(100).optional(),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo.'),
  threshold: z.coerce.number().int().min(0, 'El umbral no puede ser negativo.'),
  expDate: z.string().min(1, 'La fecha de caducidad es obligatoria.'),
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
  const { medicineId } = useParams<{ blisterId: string; medicineId: string }>();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const upsertMedicine = useMedicinesStore((s) => s.upsertMedicine);
  const removeFromStore = useMedicinesStore((s) => s.removeMedicine);
  const addToast = useUiStore((s) => s.addToast);

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { alias: '', stock: 0, threshold: 0, expDate: '' },
  });

  useEffect(() => {
    if (!activeBlisterId || !medicineId) return;
    let cancelled = false;
    setLoadError(null);
    getMedicine(activeBlisterId, medicineId)
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
    return () => { cancelled = true; };
  }, [activeBlisterId, medicineId, reset]);

  if (!activeBlisterId) return <Navigate to={ROUTES.blisters} replace />;
  if (activeRole !== 'OWNER' && activeRole !== 'CAREGIVER') {
    return <Navigate to={ROUTES.blisterMedications(activeBlisterId)} replace />;
  }
  if (!medicineId) return <Navigate to={ROUTES.blisterMedications(activeBlisterId)} replace />;

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const updated = await updateMedicine(activeBlisterId, medicineId, {
        alias: data.alias || undefined,
        stock: data.stock,
        threshold: data.threshold,
        expDate: new Date(data.expDate),
      });
      upsertMedicine(updated);
      addToast({ message: 'Medicamento actualizado.', variant: 'success' });
      navigate(ROUTES.medicineDetail(activeBlisterId, medicineId));
    } catch (err) {
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido actualizar.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este medicamento del botiquín?')) return;
    setDeleting(true);
    try {
      await removeMedicine(activeBlisterId, medicineId);
      removeFromStore(medicineId);
      addToast({ message: 'Medicamento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterMedications(activeBlisterId));
    } catch (err) {
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido eliminar.');
      setDeleting(false);
    }
  };

  return (
    <section className="c-add-medicine-page" aria-labelledby="edit-medicine-title">
      <header className="c-add-medicine-page__header">
        <button type="button" className="c-add-medicine-page__back" onClick={() => navigate(-1)} aria-label="Volver">←</button>
        <h1 id="edit-medicine-title" className="c-add-medicine-page__title">Editar medicamento</h1>
        <span aria-hidden="true" />
      </header>

      {loadError ? (
        <ErrorState message={loadError} />
      ) : !medicine ? (
        <div aria-busy="true">
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      ) : (
        <form className="c-add-medicine-page__form" onSubmit={handleSubmit(onSubmit)}>
          <div className="c-add-medicine-page__selected">
            <p className="c-add-medicine-page__selected-name">{medicine.nombre}</p>
            <p className="c-add-medicine-page__selected-meta">{medicine.pactivos}</p>
          </div>
          {submitError ? <ErrorState message={submitError} /> : null}
          <Input label="Alias (opcional)" type="text" {...register('alias')} error={errors.alias?.message} />
          <Input label="Stock *" type="number" min={0} {...register('stock')} error={errors.stock?.message} />
          <Input label="Umbral de aviso *" type="number" min={0} {...register('threshold')} error={errors.threshold?.message} />
          <Input label="Fecha de caducidad *" type="date" {...register('expDate')} error={errors.expDate?.message} />
          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>Guardar cambios</Button>
          <Button type="button" variant="danger" fullWidth onClick={handleDelete} loading={deleting}>
            Eliminar del botiquín
          </Button>
        </form>
      )}
    </section>
  );
}

export default EditMedicinePage;
