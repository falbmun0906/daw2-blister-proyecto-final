import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TbLayoutDashboard, TbBell, TbUserCircle } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';
import { BlisterSelector } from '../organisms/BlisterSelector';

/** Cabecera de pantallas autenticadas: marca, título y acciones. */
export function AppHeader() {
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const user = useAuthStore((state) => state.user);
  const unreadCount = useUnreadNotificationsCount();
  const [isSelectorOpen, setSelectorOpen] = useState(false);

  const activeBlister = blisters.find((b) => b._id === activeBlisterId) ?? null;
  const title = activeBlister?.name ?? 'BLÍSTER';

  return (
    <header className="c-app-header" role="banner">
      <button
        type="button"
        className="c-app-header__brand"
        aria-label="Cambiar de blíster"
        aria-haspopup="dialog"
        aria-expanded={isSelectorOpen}
        onClick={() => setSelectorOpen(true)}
      >
        <TbLayoutDashboard className="c-icon c-icon--lg" aria-hidden="true" />
      </button>

      <h1 className="c-app-header__title">{title}</h1>

      <div className="c-app-header__actions">
        <Link
          to={ROUTES.notifications}
          className="c-app-header__action"
          aria-label={
            unreadCount > 0
              ? `Ver notificaciones (${unreadCount} sin leer)`
              : 'Ver notificaciones'
          }
        >
          <TbBell className="c-icon c-icon--lg" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="c-app-header__badge" aria-hidden="true" />
          ) : null}
        </Link>
        <Link to={ROUTES.profile} className="c-app-header__action" aria-label="Ir a tu perfil">
          {user ? (
            <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="sm" />
          ) : (
            <TbUserCircle className="c-icon c-icon--lg" aria-hidden="true" />
          )}
        </Link>
      </div>

      {isSelectorOpen ? <BlisterSelector onClose={() => setSelectorOpen(false)} /> : null}
    </header>
  );
}
