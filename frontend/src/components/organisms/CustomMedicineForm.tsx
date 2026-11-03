import { useRef, useState } from 'react';
import { useMutationContext } from '../../hooks/use.mutation-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createCustomMedicineSchema,
  type CreateMedicineInput,
  type Medicine,
} from '../../../../shared/schemas/medicine.schema';
import { stockUnits } from '../../../../shared/schemas/schema.constants';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { isApiError } from '../../types/api.types';
import { Button } from '../atoms/Button';
import { ErrorState } from '../atoms/ErrorState';
import { Input } from '../atoms/Input';
import { FormSection } from '../molecules/FormSection';

const buildFormSchema = (originalExpiry = '') =>
  createCustomMedicineSchema.omit({ source: true, expDate: true, captureMethod: true }).extend({
    expDate: z
      .string()
      .refine(
        (value) =>
          !value ||
          value === originalExpiry ||
          (!Number.isNaN(Date.parse(value)) && Date.parse(value) > Date.now()),
        'La caducidad debe ser una fecha futura.',
      ),
  });
type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;
export type CustomMedicineInput = Extract<CreateMedicineInput, { source: 'custom' }>;

interface Props {
  initial?: Medicine;
  initialName?: string;
  fromPhoto?: boolean;
  onSave: (input: CustomMedicineInput) => Promise<void>;
}

export function CustomMedicineForm({
  initial,
  initialName = '',
  fromPhoto = false,
  onSave,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const captureMutation = useMutationContext();
  const identityLocked = initial?.identityLocked === true;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: createZodFormResolver(buildFormSchema(initial?.expDate?.slice(0, 10))),
    defaultValues: {
      nombre: initial?.nombre ?? initialName,
      alias: initial?.alias ?? '',
      customDetails: initial?.customDetails ?? {
        productType: 'supplement',
        brand: '',
        composition: '',
        format: '',
        strength: '',
      },
      stock: initial?.stock ?? 0,
      stockUnit: initial?.stockUnit ?? 'pastillas',
      threshold: initial?.threshold ?? 5,
      expDate: initial?.expDate?.slice(0, 10) ?? '',
    },
  });

  const submit = async (values: FormValues) => {
    if (pending.current) return;
    pending.current = true;
    const isCurrent = captureMutation();
    setError(null);
    try {
      await onSave({
        ...values,
        source: 'custom',
        captureMethod: fromPhoto ? 'ocr' : 'manual',
        expDate: values.expDate ? new Date(values.expDate) : null,
      });
    } catch (err) {
      if (!isCurrent()) return;
      setError(
        isApiError(err)
          ? err.message
          : 'No se ha podido guardar el producto. Revisa los datos e inténtalo de nuevo.',
      );
    } finally {
      pending.current = false;
    }
  };

  return (
    <form
      className="c-add-medicine-page__form"
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
    >
      <p className="c-add-medicine-page__notice">
        Producto personalizado · Datos introducidos por el usuario.{' '}
        {fromPhoto ? 'Revisa el nombre leído de la fotografía. ' : ''}No se vinculará a una ficha
        CIMA.
      </p>
      {error ? <ErrorState message={error} /> : null}
      <FormSection label="Identifica el producto">
        {identityLocked ? (
          <p>
            La identidad se conserva porque el producto ya se ha asignado a una pauta. Para
            gestionar otro producto, crea una nueva entrada.
          </p>
        ) : null}
        <Input
          label="Nombre del producto"
          maxLength={200}
          autoComplete="off"
          readOnly={identityLocked}
          {...register('nombre')}
          error={errors.nombre?.message}
        />
        <label className="c-field">
          <span className="c-field__label">Tipo de producto</span>
          <select
            className="c-field__input"
            {...register('customDetails.productType')}
            disabled={identityLocked}
          >
            <option value="supplement">Complemento alimenticio</option>
            <option value="medicine">Medicamento sin vincular a CIMA</option>
            <option value="other">Otro producto</option>
          </select>
        </label>
        <details className="c-custom-medicine-details">
          <summary>Marca, formato y composición (opcional)</summary>
          <div className="c-custom-medicine-details__fields">
            <Input
              label="Marca (opcional)"
              readOnly={identityLocked}
              maxLength={100}
              {...register('customDetails.brand')}
              error={errors.customDetails?.brand?.message}
            />
            <Input
              label="Composición (opcional)"
              readOnly={identityLocked}
              maxLength={300}
              placeholder="Ej. Citrato de magnesio"
              {...register('customDetails.composition')}
              error={errors.customDetails?.composition?.message}
            />
            <Input
              label="Formato (opcional)"
              readOnly={identityLocked}
              maxLength={100}
              placeholder="Ej. Cápsulas, sobres, solución"
              {...register('customDetails.format')}
              error={errors.customDetails?.format?.message}
            />
            <Input
              label="Concentración declarada (opcional)"
              readOnly={identityLocked}
              maxLength={100}
              hint="Copia la etiqueta. Este dato no establece una pauta de toma ni convierte unidades de stock."
              {...register('customDetails.strength')}
              error={errors.customDetails?.strength?.message}
            />
            <Input
              label="Alias (opcional)"
              maxLength={100}
              {...register('alias')}
              error={errors.alias?.message}
            />
          </div>
        </details>
      </FormSection>
      <FormSection
        label="Cantidad disponible"
        hint="Stock y umbral admiten incrementos de 0,5. La cantidad de cada toma se configura en Tratamientos usando esta misma unidad."
      >
        <Input
          label="Stock inicial o disponible"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          {...register('stock')}
          error={errors.stock?.message}
        />
        <label className="c-field">
          <span className="c-field__label">Unidad de stock</span>
          <select className="c-field__input" {...register('stockUnit')} disabled={Boolean(initial)}>
            {stockUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {initial ? (
            <span className="c-field__hint">
              La unidad se conserva para mantener coherentes las tomas registradas.
            </span>
          ) : null}
        </label>
        <Input
          label="Umbral de aviso"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          {...register('threshold')}
          error={errors.threshold?.message}
        />
        <Input
          label="Fecha de caducidad (opcional)"
          type="date"
          hint="Si no la conoces, deja el campo vacío. No se generarán avisos de caducidad."
          {...register('expDate')}
          error={errors.expDate?.message}
        />
      </FormSection>
      <div className="c-add-medicine-page__sticky-cta">
        <Button type="submit" fullWidth loading={isSubmitting}>
          {initial ? 'Guardar cambios' : 'Confirmar y añadir producto'}
        </Button>
      </div>
    </form>
  );
}
