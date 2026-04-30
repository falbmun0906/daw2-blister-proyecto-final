import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import {
  createBlisterSchema,
  type CreateBlisterInput,
} from '../../../../shared/schemas/blister.schema';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { createBlister } from '../../services/blisters.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

/** Formulario para crear un blíster. El creador queda como OWNER. */
export default function BlisterCreatePage() {
  usePageTitle('Crear blíster');
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const upsertBlister = useBlisterStore((s) => s.upsertBlister);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const addToast = useUiStore((s) => s.addToast);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBlisterInput>({
    resolver: zodResolver(createBlisterSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const blister = await createBlister(values);
      upsertBlister(blister);
      const role = userId
        ? blister.members.find((m) => m.userId === userId)?.role ?? null
        : null;
      setActiveBlister(blister._id, role);
      addToast({ message: 'Blíster creado correctamente.', variant: 'success' });
      navigate(ROUTES.home);
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'No se ha podido crear el blíster. Inténtalo de nuevo.';
      setSubmitError(message);
      addToast({ message, variant: 'error' });
    }
  });

  return (
    <section aria-label="Crear blíster">
      <p className="c-home__subtitle" style={{ marginBottom: 'var(--space-4)' }}>
        Te asignaremos automáticamente como propietario.
      </p>

      <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          label="Nombre del blíster"
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />

        {submitError ? (
          <p role="alert" className="c-field__error">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Crear blíster
        </Button>
        <Link to={ROUTES.joinBlister} className="c-btn c-btn--ghost c-btn--full">
          Tengo un código de invitación
        </Link>
      </form>
    </section>
  );
}
