import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import {
  joinBlisterSchema,
  type JoinBlisterInput,
} from '../../../../shared/schemas/blister.schema';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { joinBlister } from '../../services/blisters.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

/** Formulario para unirse a un blíster con un código de invitación. */
export default function BlisterJoinPage() {
  usePageTitle('Unirse a un blíster');
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
  } = useForm<JoinBlisterInput>({
    resolver: createZodFormResolver(joinBlisterSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const blister = await joinBlister(values);
      upsertBlister(blister);
      const role = userId
        ? blister.members.find((m) => m.userId === userId)?.role ?? null
        : null;
      setActiveBlister(blister._id, role);
      addToast({ message: '¡Te has unido al blíster!', variant: 'success' });
      navigate(ROUTES.blisters);
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : 'No se ha podido validar el código. Comprueba que sea correcto.';
      setSubmitError(message);
      addToast({ message, variant: 'error' });
    }
  });

  return (
    <section aria-label="Unirse a un blíster">
      <p className="c-home__subtitle" style={{ marginBottom: 'var(--space-4)' }}>
        Introduce el código que te ha facilitado el propietario.
      </p>

      <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          label="Código de invitación"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={8}
          error={errors.code?.message}
          {...register('code')}
        />

        {submitError ? (
          <p role="alert" className="c-field__error">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Unirme
        </Button>
        <Link to={ROUTES.createBlister} className="c-btn c-btn--ghost c-btn--full">
          Crear un blíster nuevo
        </Link>
      </form>
    </section>
  );
}
