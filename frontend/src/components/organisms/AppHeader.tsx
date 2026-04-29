import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TbBell, TbUserCircle, TbWritingSign } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';
import { BlisterSelector } from '../organisms/BlisterSelector';

/** Cabecera del Home autenticado: marca + acciones (notificaciones / perfil). */
export function AppHeader() {
  const blisters = useBlisterStore((state) => state.blisters);
  const user = useAuthStore((state) => state.user);
  const unreadCount = useUnreadNotificationsCount();
  const [isSelectorOpen, setSelectorOpen] = useState(false);

  return (
    <header className="c-app-header" role="banner">
      <button
        type="button"
        className="c-app-header__brand"
        aria-label={blisters.length > 1 ? 'Cambiar de blíster' : 'Mis blísters'}
        aria-haspopup="dialog"
        aria-expanded={isSelectorOpen}
        onClick={() => setSelectorOpen(true)}
      >
        <TbWritingSign className="c-app-header__brand-icon" aria-hidden="true" />
      </button>

      <h1 className="c-app-header__title">Blíster</h1>

      <div className="c-app-header__actions">
        <Link
          to={ROUTES.notifications}
          className="c-app-header__action c-app-header__action--bell"
          aria-label={
            unreadCount > 0
              ? `Ver notificaciones (${unreadCount} sin leer)`
              : 'Ver notificaciones'
          }
        >
          <TbBell className="c-app-header__action-icon" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="c-app-header__badge" aria-hidden="true" />
          ) : null}
        </Link>
        <Link to={ROUTES.profile} className="c-app-header__action c-app-header__action--avatar" aria-label="Ir a tu perfil">
          {user ? (
            <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="sm" />
          ) : (
            <TbUserCircle className="c-app-header__action-icon" aria-hidden="true" />
          )}
        </Link>
      </div>

      {isSelectorOpen ? <BlisterSelector onClose={() => setSelectorOpen(false)} /> : null}
    </header>
  );
}
