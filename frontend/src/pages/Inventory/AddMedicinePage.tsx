import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { Skeleton } from '../../components/atoms/Skeleton';
import { SearchBar } from '../../components/molecules/SearchBar';
import { ROUTES } from '../../constants/routes';
import { stockUnits } from '../../../../shared/schemas/schema.constants';
import { createMedicine } from '../../services/medicines.service';
import { searchCima } from '../../services/external.service';
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

function AddMedicinePage() {
  const navigate = useNavigate();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const upsertMedicine = useMedicinesStore((s) => s.upsertMedicine);
  const addToast = useUiStore((s) => s.addToast);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExternalSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExternalSearchItem | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { alias: '', stock: 0, stockUnit: 'pastillas', threshold: 5, expDate: '' },
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    searchCima(query)
      .then((items) => { if (!cancelled) setResults(items); })
      .catch((err) => {
        if (cancelled) return;
        setSearchError(isApiError(err) ? err.message : 'No se ha podido buscar en CIMA.');
      })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [query]);

  if (!activeBlisterId) return <Navigate to={ROUTES.blisters} replace />;
  if (activeRole !== 'OWNER' && activeRole !== 'CAREGIVER') {
    return <Navigate to={ROUTES.blisterMedications(activeBlisterId)} replace />;
  }

  const onSubmit = async (data: FormValues) => {
    if (!selected) return;
    setSubmitError(null);
    try {
      const created = await createMedicine(activeBlisterId, {
        nregist: selected.nregist,
        alias: data.alias || undefined,
        stock: data.stock,
        stockUnit: data.stockUnit,
        threshold: data.threshold,
        expDate: new Date(data.expDate),
      });
      upsertMedicine(created);
      addToast({ message: 'Medicamento añadido al botiquín.', variant: 'success' });
      navigate(ROUTES.blisterMedications(activeBlisterId));
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setSubmitError('Este medicamento ya existe en el botiquín.');
        return;
      }
      setSubmitError(isApiError(err) ? err.message : 'No se ha podido añadir el medicamento.');
    }
  };

  return (
    <section className="c-add-medicine-page" aria-labelledby="add-medicine-title">
      <header className="c-add-medicine-page__header">
        <button
          type="button"
          className="c-add-medicine-page__back"
          onClick={() => (selected ? setSelected(null) : navigate(-1))}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 id="add-medicine-title" className="c-add-medicine-page__title">
          {selected ? 'Detalles del medicamento' : 'Añadir medicamento'}
        </h1>
        <span aria-hidden="true" />
      </header>

      {!selected ? (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar en CIMA por nombre o principio activo…"
            ariaLabel="Buscar en CIMA"
            autoFocus
          />
          {searchError ? (
            <ErrorState message={searchError} />
          ) : searching ? (
            <div className="c-add-medicine-page__results" aria-busy="true">
              <Skeleton height="3rem" />
              <Skeleton height="3rem" />
              <Skeleton height="3rem" />
            </div>
          ) : !query.trim() ? (
            <EmptyState
              title="Busca un medicamento"
              description="Escribe al menos 3 letras para buscar en la base oficial CIMA."
            />
          ) : results.length === 0 ? (
            <EmptyState title="Sin resultados" description="Prueba con otro término." />
          ) : (
            <ul className="c-add-medicine-page__results">
              {results.map((item) => (
                <li key={item.nregist}>
                  <button
                    type="button"
                    className="c-add-medicine-page__result"
                    onClick={() => setSelected(item)}
                  >
                    <span className="c-add-medicine-page__result-name">{item.nombre}</span>
                    <span className="c-add-medicine-page__result-meta">{item.pactivos}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <form className="c-add-medicine-page__form" onSubmit={handleSubmit(onSubmit)}>
          <div className="c-add-medicine-page__selected">
            <p className="c-add-medicine-page__selected-name">{selected.nombre}</p>
            <p className="c-add-medicine-page__selected-meta">{selected.pactivos}</p>
          </div>
          {submitError ? <ErrorState message={submitError} /> : null}
          <Input label="Alias (opcional)" type="text" {...register('alias')} error={errors.alias?.message} />
          <Input
            label="Stock inicial *"
            type="number"
            min={0}
            {...register('stock')}
            error={errors.stock?.message}
          />
          <label className="c-field">
            <span className="c-field__label">
              <span className="c-field__label-text">Unidad *</span>
            </span>
            <select className="c-field__select" {...register('stockUnit')}>
              {stockUnits.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {errors.stockUnit ? (
              <span className="c-field__error" role="status">{errors.stockUnit.message}</span>
            ) : null}
          </label>
          <Input
            label="Umbral de aviso *"
            type="number"
            min={0}
            hint="Recibirás un aviso cuando el stock baje de este valor."
            {...register('threshold')}
            error={errors.threshold?.message}
          />
          <Input
            label="Fecha de caducidad *"
            type="date"
            {...register('expDate')}
            error={errors.expDate?.message}
          />
          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Añadir al botiquín
          </Button>
        </form>
      )}
    </section>
  );
}

export default AddMedicinePage;
