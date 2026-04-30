import { Link } from 'react-router-dom';
import { TbBell, TbUserCircle, TbWritingSign } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';

/**
 * Cabecera del Home autenticado: marca + acciones (notificaciones / perfil).
 *
 * La marca es decorativa (no abre el selector de blísters). La gestión de
 * blísters vive en Perfil → Mis blísters según la arquitectura de información
 * del proyecto (docs §3.1).
 */
export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const unreadCount = useUnreadNotificationsCount();

  return (
    <header className="c-app-header" role="banner">
      <span className="c-app-header__brand" aria-hidden="true">
        <TbWritingSign className="c-app-header__brand-icon" aria-hidden="true" />
      </span>

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
    </header>
  );
}
