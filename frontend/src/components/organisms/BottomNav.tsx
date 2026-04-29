import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';
import {
  TbHome,
  TbMedicineSyrup,
  TbPill,
  TbCalendar,
  TbBell,
} from 'react-icons/tb';

import { NotificationDot } from '../molecules/NotificationDot';
import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';
import { useUnreadNotificationsCount } from '../../stores/notifications.store';

interface NavItem {
  to: string | null;
  label: string;
  icon: ReactElement;
  showDot?: boolean;
  requiresBlister?: boolean;
}

/** Barra inferior de navegación primaria. */
export function BottomNav() {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const unreadCount = useUnreadNotificationsCount();

  const items: NavItem[] = [
    {
      to: ROUTES.home,
      label: 'Inicio',
      icon: <TbHome className="c-icon c-icon--lg" aria-hidden="true" />,
    },
    {
      to: activeBlisterId ? ROUTES.blisterMedications(activeBlisterId) : null,
      label: 'Botiquín',
      icon: <TbMedicineSyrup className="c-icon c-icon--lg" aria-hidden="true" />,
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
      to: ROUTES.notifications,
      label: 'Avisos',
      icon: <TbBell className="c-icon c-icon--lg" aria-hidden="true" />,
      showDot: true,
    },
  ];

  return (
    <nav className="c-bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, icon, showDot, requiresBlister }) => {
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
