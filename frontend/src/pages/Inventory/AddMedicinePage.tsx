import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TbCalendar, TbFileText, TbInfoCircle, TbNumbers, TbTag } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Stepper } from '../../components/atoms/Stepper';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { stockUnits } from '../../../../shared/schemas/schema.constants';
import { createMedicine } from '../../services/medicines.service';
import { getCimaDetail } from '../../services/external.service';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { ExternalSearchItem } from '../../types/medicine.types';
import './AddMedicinePage.scss';

const formSchema = z.object({
  alias: z.string().trim().max(100).optional(),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo.'),
  stockUnit: z.enum(stockUnits),
  threshold: z.coerce.number().int().min(0, 'El umbral no puede ser negativo.'),
  expDate: z.string().min(1, 'La fecha de caducidad es obligatoria.'),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Página de alta de medicamento. Espera siempre llegar con `?nregist=...` en
 * la URL (precargado desde el buscador CIMA del Home/Botiquín). Si no hay
 * `nregist`, mostramos un estado vacío que redirige al buscador.
 */
function AddMedicinePage() {
  usePageTitle('Detalles del medicamento');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const [searchParams] = useSearchParams();
  const presetNregist = searchParams.get('nregist');
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const upsertMedicine = useMedicinesStore((s) => s.upsertMedicine);
  const addToast = useUiStore((s) => s.addToast);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const routeRole = blisters
    .find((blister) => blister._id === blisterId)
    ?.members.find((member) => member.userId === userId)
    ?.role ?? null;

  const [selected, setSelected] = useState<ExternalSearchItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { alias: '', stock: 0, stockUnit: 'pastillas', threshold: 5, expDate: '' },
  });

  const stockUnit = watch('stockUnit');

  useEffect(() => {
    if (!presetNregist) return;
    let cancelled = false;
    setLoadError(null);
    getCimaDetail(presetNregist)
      .then((info) => {
        if (cancelled) return;
        setSelected({
          nregist: info.nregist,
          nombre: info.nombre,
          pactivos: info.pactivos,
          labtitular: info.labtitular,
          formaOficial: info.formaOficial,
          dosisOficial: info.dosisOficial,
          fotoUrl: info.fotos.find((foto) => foto.url)?.url ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(isApiError(err) ? err.message : 'No se ha podido cargar el medicamento.');
      });
    return () => {
      cancelled = true;
    };
  }, [presetNregist]);

  if (!blisterId) return <Navigate to={ROUTES.blisters} replace />;
  const role = routeRole ?? activeRole;
  if (role !== 'OWNER' && role !== 'CAREGIVER') {
    return <Navigate to={ROUTES.blisterMedications(blisterId)} replace />;
  }

  // Sin `nregist` no podemos saber qué medicamento añadir. Redirigimos al
  // botiquín con un mensaje breve para que el usuario inicie la búsqueda.
  if (!presetNregist) {
    return (
      <section className="c-add-medicine-page" aria-label="Añadir medicamento">
        <EmptyState
          title="Busca primero un medicamento"
          description="Usa el buscador del Botiquín o del Home para localizar un medicamento en CIMA y añadirlo desde ahí."
          ctaLabel="Ir al Botiquín"
          onCtaClick={() => navigate(ROUTES.blisterMedications(blisterId))}
        />
      </section>
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (!selected) return;
    setSubmitError(null);
    try {
      const created = await createMedicine(blisterId, {
        nregist: selected.nregist,
        alias: data.alias || undefined,
        stock: data.stock,
        stockUnit: data.stockUnit,
        threshold: data.threshold,
        expDate: new Date(data.expDate),
      });
      upsertMedicine(created);
      addToast({ message: 'Medicamento añadido al botiquín.', variant: 'success' });
      navigate(ROUTES.blisterMedications(blisterId));
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setSubmitError('Este medicamento ya existe en el botiquín.');
        return;
      }
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido añadir el medicamento.');
    }
  };

  return (
    <section className="c-add-medicine-page" aria-label="Detalles del medicamento">
      {loadError ? (
        <ErrorState message={loadError} />
      ) : !selected ? (
        <div className="c-add-medicine-page__form" aria-busy="true">
          <Skeleton height="3rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
        </div>
      ) : (
        <form className="c-add-medicine-page__form" onSubmit={handleSubmit(onSubmit)}>
          <div className="c-add-medicine-page__selected">
            <p className="c-add-medicine-page__selected-name">{selected.nombre}</p>
            <p className="c-add-medicine-page__selected-meta">{selected.pactivos}</p>
          </div>
          {submitError ? <ErrorState message={submitError} /> : null}

          <FormSection
            label="Añadir alias al medicamento"
            hint="Un nombre corto que solo verás tú (opcional)."
            icon={<TbTag />}
          >
            <Input
              label="Alias"
              type="text"
              placeholder="Ej. La pastilla de la tensión"
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
                  label="Stock inicial"
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  min={0}
                  max={9999}
                  unit={stockUnit}
                  error={fieldState.error?.message}
                />
              )}
            />

            <div className="c-add-medicine-page__unit-row" role="radiogroup" aria-label="Unidad de stock">
              {stockUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={stockUnit === u}
                  className={[
                    'c-pill-toggle',
                    stockUnit === u && 'c-pill-toggle--active',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setValue('stockUnit', u, { shouldDirty: true })}
                >
                  {u}
                </button>
              ))}
            </div>

            <Controller
              control={control}
              name="threshold"
              render={({ field, fieldState }) => (
                <Stepper
                  label="Umbral de aviso"
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  min={0}
                  max={9999}
                  unit={stockUnit}
                  error={fieldState.error?.message}
                />
              )}
            />
          </FormSection>

          <FormSection
            label="Tratamiento al que pertenece"
            hint="Podrás vincularlo desde la sección de tratamientos."
            icon={<TbFileText />}
          >
            <p className="c-add-medicine-page__placeholder">
              Por ahora, este medicamento se añadirá sin tratamiento asociado.
            </p>
          </FormSection>

          <FormSection
            label="Contraindicaciones"
            hint="Consulta el prospecto oficial para ver advertencias e interacciones."
            icon={<TbInfoCircle />}
          >
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => navigate(ROUTES.cimaMedicineDetail(selected.nregist))}
            >
              Ver prospecto en CIMA
            </Button>
          </FormSection>

          <div className="c-add-medicine-page__sticky-cta">
            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              Confirmar y añadir
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export default AddMedicinePage;
