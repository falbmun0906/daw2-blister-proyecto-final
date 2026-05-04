import { Link } from 'react-router-dom';
import { TbBell, TbUserCircle } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const unreadCount = useUnreadNotificationsCount();
  const openNotifications = useUiStore((state) => state.openNotificationsSheet);

  return (
    <header className="c-app-header" role="banner">
      <h1 className="c-app-header__title">Blíster</h1>

      <div className="c-app-header__right">
        <div className="c-app-header__actions">
          <button
            type="button"
            className="c-app-header__action c-app-header__action--bell"
            aria-label={
              unreadCount > 0
                ? `Ver notificaciones (${unreadCount} sin leer)`
                : 'Ver notificaciones'
            }
            onClick={openNotifications}
          >
            <TbBell className="c-app-header__action-icon" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="c-app-header__badge" aria-hidden="true" />
            ) : null}
          </button>
          <Link
            to={ROUTES.profile}
            className="c-app-header__action c-app-header__action--avatar"
            aria-label="Ir a tu perfil"
          >
            {user ? (
              <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="sm" />
            ) : (
              <TbUserCircle className="c-app-header__action-icon" aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
