import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';
import { FaBriefcaseMedical } from 'react-icons/fa6';
import {
  TbHome,
  TbPill,
  TbCalendar,
  TbBell,
} from 'react-icons/tb';

import { NotificationDot } from '../molecules/NotificationDot';
import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';
import { useUiStore } from '../../stores/ui.store';

interface NavItem {
  to: string | null;
  label: string;
  icon: ReactElement;
  showDot?: boolean;
  requiresBlister?: boolean;
  onClick?: () => void;
}

/** Barra inferior de navegación primaria. */
export function BottomNav() {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const unreadCount = useUnreadNotificationsCount();
  const openNotifications = useUiStore((s) => s.openNotificationsSheet);

  const items: NavItem[] = [
    {
      to: ROUTES.home,
      label: 'Inicio',
      icon: <TbHome className="c-icon c-icon--lg" aria-hidden="true" />,
    },
    {
      to: activeBlisterId ? ROUTES.blisterMedications(activeBlisterId) : null,
      label: 'Botiquín',
      icon: <FaBriefcaseMedical className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
    {
      to: activeBlisterId ? ROUTES.blisterTreatments(activeBlisterId) : null,
      label: 'Tratamientos',
      icon: <TbPill className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
    {
      to: activeBlisterId ? ROUTES.blisterAppointments(activeBlisterId) : null,
      label: 'Calendario',
      icon: <TbCalendar className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
    {
      to: null,
      label: 'Avisos',
      icon: <TbBell className="c-icon c-icon--lg" aria-hidden="true" />,
      showDot: true,
      onClick: openNotifications,
    },
  ];

  return (
    <nav className="c-bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, icon, showDot, requiresBlister, onClick }) => {
        if (onClick && to === null) {
          return (
            <button
              key={label}
              type="button"
              className="c-bottom-nav__item"
              onClick={onClick}
            >
              <span className="c-bottom-nav__icon-wrapper">
                {icon}
                {showDot ? <NotificationDot count={unreadCount} /> : null}
              </span>
              <span className="c-bottom-nav__label">{label}</span>
            </button>
          );
        }
        const isDisabled = (requiresBlister && !activeBlisterId) || to === null;
        if (isDisabled || to === null) {
          return (
            <span
              key={label}
              className="c-bottom-nav__item is-disabled"
              aria-disabled="true"
              role="link"
              title="Selecciona un blíster para acceder"
            >
              <span className="c-bottom-nav__icon-wrapper">{icon}</span>
              <span className="c-bottom-nav__label">{label}</span>
            </span>
          );
        }
        return (
          <NavLink
            key={label}
            to={to}
            end={to === ROUTES.home}
            className={({ isActive }) =>
              ['c-bottom-nav__item', isActive && 'is-active'].filter(Boolean).join(' ')
            }
          >
            <span className="c-bottom-nav__icon-wrapper">
              {icon}
              {showDot ? <NotificationDot count={unreadCount} /> : null}
            </span>
            <span className="c-bottom-nav__label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
