import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutationContext } from '../../hooks/use.mutation-context';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { TbCalendar, TbFileText, TbInfoCircle, TbNumbers, TbTag } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { MedicineEntryOptions } from '../../components/organisms/MedicineEntryOptions';
import { CustomMedicineCreate } from './CustomMedicineCreate';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Stepper } from '../../components/atoms/Stepper';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { stockUnits } from '../../../../shared/schemas/schema.constants';
import { createMedicine } from '../../services/medicines.service';
import { getCimaByNationalCode, getCimaDetail } from '../../services/external.service';
import { usePageTitle, usePageBackOverride } from '../../hooks/use.page-title';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { ExternalMedicineInfo, ExternalSearchItem } from '../../types/medicine.types';

const formSchema = z.object({
  alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
  stock: z.coerce
    .number()
    .min(0, 'El stock no puede ser negativo.')
    .refine((value) => Number.isInteger(value * 2), 'El stock debe ir en incrementos de 0,5.'),
  stockUnit: z.enum(stockUnits),
  threshold: z.coerce
    .number()
    .min(0, 'El umbral no puede ser negativo.')
    .refine((value) => Number.isInteger(value * 2), 'El umbral debe ir en incrementos de 0,5.'),
  expDate: z.string().min(1, 'La fecha de caducidad es obligatoria.'),
});
type FormValues = z.infer<typeof formSchema>;

/** Unified entry point; a selected CIMA result always needs confirmation. */
function AddMedicinePage() {
  const location = useLocation();
  return <MedicineEntryContent key={location.key} />;
}

// Each entry step owns its form and pending request lifetime.
function MedicineEntryContent() {
  usePageTitle('Añadir al botiquín');
  const navigate = useNavigate();
  const captureMutation = useMutationContext();
  const location = useLocation();
  const entryState = location.state as {
    scanName?: string;
    fromPhoto?: boolean;
    captureMethod?: string;
    scanQuery?: string;
  } | null;
  const pending = useRef(false);
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const [searchParams] = useSearchParams();
  const presetNregist = searchParams.get('nregist');
  const presetCn = searchParams.get('cn');
  const isCustom = searchParams.get('source') === 'custom';
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const upsertMedicine = useMedicinesStore((s) => s.upsertMedicine);
  const addToast = useUiStore((s) => s.addToast);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const goBack = useCallback(() => {
    if (!blisterId) return;
    if (presetNregist || isCustom) {
      navigate(
        `${ROUTES.addMedicine(blisterId)}${entryState?.scanQuery !== undefined ? '?mode=scan' : ''}`,
        {
          replace: true,
          state: { scanQuery: entryState?.scanQuery, captureMethod: entryState?.captureMethod },
        },
      );
    } else if (searchParams.get('mode') === 'scan') {
      navigate(ROUTES.addMedicine(blisterId), { replace: true });
    } else navigate(ROUTES.blisterMedications(blisterId));
  }, [
    blisterId,
    presetNregist,
    isCustom,
    entryState?.scanQuery,
    entryState?.captureMethod,
    searchParams,
    navigate,
  ]);
  usePageBackOverride(goBack);
  const routeRole =
    blisters
      .find((blister) => blister._id === blisterId)
      ?.members.find((member) => member.userId === userId)?.role ?? null;

  const [selected, setSelected] = useState<ExternalSearchItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: createZodFormResolver(formSchema),
    defaultValues: { alias: '', stock: 0, stockUnit: 'pastillas', threshold: 5, expDate: '' },
  });

  const stockUnit = useWatch({ control, name: 'stockUnit' });

  useEffect(() => {
    if (!presetNregist || isCustom) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoadError(null);
      setSelected(null);
      (presetCn ? getCimaByNationalCode(presetCn) : getCimaDetail(presetNregist))
        .then((info) => {
          if (cancelled) return;
          if (info.nregist !== presetNregist) {
            setLoadError(
              'El código no corresponde al medicamento seleccionado. Repite la búsqueda.',
            );
            return;
          }
          setSelected({
            cn: info.cn,
            presentationName: info.presentationName,
            nregist: info.nregist,
            nombre: info.nombre,
            pactivos: info.pactivos,
            labtitular: info.labtitular,
            formaOficial: info.formaOficial,
            dosisOficial: info.dosisOficial,
            fotoUrl:
              info.fotos.find((foto: ExternalMedicineInfo['fotos'][number]) => foto.url)?.url ??
              null,
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
  }, [presetNregist, presetCn, isCustom]);

  if (!blisterId) return <Navigate to={ROUTES.blisters} replace />;
  const role = routeRole ?? activeRole;
  if (role !== 'OWNER' && role !== 'CAREGIVER') {
    return <Navigate to={ROUTES.blisterMedications(blisterId)} replace />;
  }

  if (isCustom)
    return (
      <CustomMedicineCreate
        blisterId={blisterId}
        initialName={typeof entryState?.scanName === 'string' ? entryState.scanName : ''}
        fromPhoto={entryState?.fromPhoto === true}
      />
    );
  if (!presetNregist) return <MedicineEntryOptions blisterId={blisterId} />;

  const onSubmit = async (data: FormValues) => {
    if (!selected || pending.current || selected.nregist !== presetNregist) return;
    pending.current = true;
    const isCurrent = captureMutation();
    setSubmitError(null);
    try {
      const created = await createMedicine(blisterId, {
        nregist: selected.nregist,
        cn: selected.cn,
        captureMethod:
          entryState?.captureMethod === 'barcode'
            ? 'barcode'
            : entryState?.captureMethod === 'ocr'
              ? 'ocr'
              : 'search',
        alias: data.alias || undefined,
        stock: data.stock,
        stockUnit: data.stockUnit,
        threshold: data.threshold,
        expDate: new Date(data.expDate),
      });
      if (!isCurrent()) return;
      upsertMedicine(created);
      addToast({ message: 'Medicamento añadido al botiquín.', variant: 'success' });
      navigate(ROUTES.blisterMedications(blisterId));
    } catch (err) {
      if (!isCurrent()) return;
      if (isApiError(err) && err.status === 409) {
        setSubmitError('Este medicamento ya existe en el botiquín.');
        return;
      }
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido añadir el medicamento.');
    } finally {
      pending.current = false;
    }
  };

  return (
    <section className="c-add-medicine-page" aria-label="Detalles del medicamento">
      {loadError ? (
        <ErrorState message={loadError} />
      ) : !selected ||
        selected.nregist !== presetNregist ||
        (presetCn && selected.cn !== presetCn) ? (
        <div className="c-add-medicine-page__form" aria-busy="true">
          <Skeleton height="3rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
          <Skeleton height="6rem" />
        </div>
      ) : (
        <form
          className="c-add-medicine-page__form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <div className="c-add-medicine-page__selected">
            <p className="c-add-medicine-page__selected-name">{selected.nombre}</p>
            <p className="c-add-medicine-page__selected-meta">{selected.pactivos}</p>
            <p className="c-add-medicine-page__selected-meta">
              {[
                selected.dosisOficial,
                selected.formaOficial,
                selected.presentationName,
                selected.cn ? `CN ${selected.cn}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p>
              Comprueba que coincide con tu envase antes de confirmar. La pauta se configura por
              separado en Tratamientos.
            </p>
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
                  step={0.5}
                  min={0}
                  max={9999}
                  unit={stockUnit}
                  error={fieldState.error?.message}
                />
              )}
            />

            <div
              className="c-add-medicine-page__unit-row"
              role="radiogroup"
              aria-label="Unidad de stock"
            >
              {stockUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={stockUnit === u}
                  className={['c-pill-toggle', stockUnit === u && 'c-pill-toggle--active']
                    .filter(Boolean)
                    .join(' ')}
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
                  step={0.5}
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
