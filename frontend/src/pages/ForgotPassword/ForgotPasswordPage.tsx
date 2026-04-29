import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa6';
import { TbMail } from 'react-icons/tb';

import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { useUiStore } from '../../stores/ui.store';
import './ForgotPasswordPage.scss';

const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'El email o usuario es obligatorio.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);
  const [showNotAvailable, setShowNotAvailable] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: '',
    },
  });

  const onSubmit = () => {
    addToast({
      message: 'La recuperación de contraseña estará disponible próximamente.',
      variant: 'info',
    });
    setShowNotAvailable(true);
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

        <h1 className="c-forgot-password-page__title">He olvidado mi contraseña</h1>

        <span className="c-forgot-password-page__spacer" aria-hidden="true" />
      </header>

      {showNotAvailable ? (
        <div className="c-forgot-password-page__state">
          <EmptyState
            title="Próximamente"
            description="La recuperación de contraseña estará disponible en las próximas actualizaciones."
          />
          <Link to={ROUTES.login} className="c-forgot-password-page__return-link">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="c-forgot-password-page__intro">
            Introduce tu correo electrónico o identificador para recibir instrucciones de recuperación.
          </p>

          <form className="c-forgot-password-page__form" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Correo electrónico o usuario"
              placeholder="tu@correo.com o tu usuario"
              type="text"
              {...register('identifier')}
              error={errors.identifier?.message}
              icon={<TbMail className="c-icon c-icon--md" aria-hidden="true" />}
            />

            <Button type="submit" variant="primary" fullWidth className="c-forgot-password-page__submit">
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