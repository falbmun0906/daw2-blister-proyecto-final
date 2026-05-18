import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TbAlertCircle, TbCheck, TbLoader2 } from 'react-icons/tb';

import { AuthLayout } from '../../components/layout/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { confirmEmail } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { isApiError } from '../../types/api.types';

type ConfirmationState = 'loading' | 'success' | 'error';

function ConfirmEmailPage() {
  usePageTitle('Confirmar correo');
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const currentUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [state, setState] = useState<ConfirmationState>('loading');
  const [message, setMessage] = useState('Estamos confirmando tu correo.');
  const hasToken = token.length > 0;
  const confirmationState: ConfirmationState = hasToken ? state : 'error';
  const confirmationMessage = hasToken ? message : 'El enlace de confirmación no es válido.';

  useEffect(() => {
    let active = true;

    if (!hasToken) {
      return () => {
        active = false;
      };
    }

    void confirmEmail({ token })
      .then((user) => {
        if (!active) return;
        if (currentUser) {
          updateUser(user);
        }
        setState('success');
        setMessage('Tu correo se ha confirmado correctamente.');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState('error');
        if (isApiError(error)) {
          setMessage(error.message);
          return;
        }
        setMessage('No se ha podido confirmar el correo.');
      });

    return () => {
      active = false;
    };
  }, [currentUser, hasToken, token, updateUser]);

  const targetRoute = currentUser ? ROUTES.home : ROUTES.login;
  const targetLabel = currentUser ? 'Ir a inicio' : 'Iniciar sesión';

  return (
    <AuthLayout className="c-confirm-email-page" innerClassName="c-confirm-email-page__inner">
      <div className="c-confirm-email-page__state" data-state={confirmationState}>
        <span className="c-confirm-email-page__mark" aria-hidden="true">
          {confirmationState === 'loading' && <TbLoader2 className="c-icon c-icon--lg" />}
          {confirmationState === 'success' && <TbCheck className="c-icon c-icon--lg" />}
          {confirmationState === 'error' && <TbAlertCircle className="c-icon c-icon--lg" />}
        </span>
        <h1 className="c-confirm-email-page__title">
          {confirmationState === 'success' ? (
            <>Correo <span className="c-confirm-email-page__title-accent">confirmado</span></>
          ) : 'Confirmar correo'}
        </h1>
        <p className="c-confirm-email-page__message">{confirmationMessage}</p>
      </div>

      {confirmationState !== 'loading' && (
        <Link to={targetRoute} className="c-btn c-btn--primary c-btn--full c-confirm-email-page__action">
          <span>{targetLabel}</span>
        </Link>
      )}
    </AuthLayout>
  );
}

export default ConfirmEmailPage;