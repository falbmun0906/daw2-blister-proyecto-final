import { useState } from 'react';
import { Link } from 'react-router-dom';

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
        <svg
          className="c-app-header__brand-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
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
          <svg
            className="c-app-header__action-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 ? (
            <span className="c-app-header__badge" aria-hidden="true" />
          ) : null}
        </Link>
        <Link to={ROUTES.profile} className="c-app-header__action" aria-label="Ir a tu perfil">
          {user ? (
            <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="sm" />
          ) : (
            <svg
              className="c-app-header__action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </Link>
      </div>

      {isSelectorOpen ? <BlisterSelector onClose={() => setSelectorOpen(false)} /> : null}
    </header>
  );
}
