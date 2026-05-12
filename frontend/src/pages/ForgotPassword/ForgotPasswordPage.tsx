import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa6';
import { TbMail } from 'react-icons/tb';

import { forgotPasswordSchema } from '../../../../shared/schemas/auth.schema';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { forgotPassword } from '../../services/auth.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      await forgotPassword(data);
      addToast({
        message: 'Si el correo existe, te enviaremos un enlace de recuperación.',
        variant: 'success',
      });
      setIsSubmitted(true);
    } catch (error) {
      if (isApiError(error) && error.code === 'VALIDATION_ERROR') {
        setGlobalError('Introduce un correo electrónico válido.');
      } else {
        setGlobalError('No hemos podido enviar las instrucciones. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout className="c-forgot-password-page" innerClassName="c-forgot-password-page__inner">
      <header className="c-forgot-password-page__header">
        <button
          type="button"
          className="c-forgot-password-page__back-btn"
          onClick={() => navigate(ROUTES.login)}
          aria-label="Volver al inicio de sesión"
        >
          <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>
        <span className="c-forgot-password-page__spacer" aria-hidden="true" />
      </header>

      <h1 className="c-forgot-password-page__title">
        <span className="c-forgot-password-page__title-accent">Recuperar</span> contraseña
      </h1>

      {isSubmitted ? (
        <div className="c-forgot-password-page__state">
          <EmptyState
            title="Revisa tu correo"
            description="Si existe una cuenta asociada, recibirás un enlace para crear una contraseña nueva."
          />
          <Link to={ROUTES.login} className="c-forgot-password-page__return-link">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="c-forgot-password-page__intro">
            Introduce tu correo electrónico y te enviaremos un enlace temporal para crear una nueva.
          </p>

          <form className="c-forgot-password-page__form" onSubmit={handleSubmit(onSubmit)}>
            {globalError ? <p className="c-forgot-password-page__error">{globalError}</p> : null}

            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
              icon={<TbMail className="c-icon c-icon--md" aria-hidden="true" />}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              className="c-forgot-password-page__submit"
            >
              Enviar
            </Button>
          </form>

          <p className="c-forgot-password-page__help">
            ¿Tienes problemas?{' '}
            <Link to={ROUTES.login} className="c-forgot-password-page__help-link">
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
