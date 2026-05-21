import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';
import {
  FaBriefcaseMedical,
  FaCalendarDays,
  FaCapsules,
  FaHouse,
} from 'react-icons/fa6';
import {
  TbBriefcase,
  TbHome,
  TbPill,
  TbCalendar,
} from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';

interface NavItem {
  to: string | null;
  label: string;
  icon: ReactElement;
  activeIcon: ReactElement;
  requiresBlister?: boolean;
}

/** Barra inferior de navegación primaria. */
export function BottomNav() {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);

  const items: NavItem[] = [
    {
      to: ROUTES.home,
      label: 'Inicio',
      icon: <TbHome className="c-icon c-icon--lg" aria-hidden="true" />,
      activeIcon: <FaHouse className="c-icon c-icon--lg" aria-hidden="true" />,
    },
    {
      to: activeBlisterId ? ROUTES.blisterMedications(activeBlisterId) : null,
      label: 'Botiquín',
      icon: <TbBriefcase className="c-icon c-icon--lg" aria-hidden="true" />,
      activeIcon: <FaBriefcaseMedical className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
    {
      to: activeBlisterId ? ROUTES.blisterTreatments(activeBlisterId) : null,
      label: 'Tratamientos',
      icon: <TbPill className="c-icon c-icon--lg" aria-hidden="true" />,
      activeIcon: <FaCapsules className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
    {
      to: activeBlisterId ? ROUTES.blisterAppointments(activeBlisterId) : null,
      label: 'Calendario',
      icon: <TbCalendar className="c-icon c-icon--lg" aria-hidden="true" />,
      activeIcon: <FaCalendarDays className="c-icon c-icon--lg" aria-hidden="true" />,
      requiresBlister: true,
    },
  ];

  return (
    <nav className="c-bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, icon, activeIcon, requiresBlister }) => {
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
            {({ isActive }) => (
              <>
                <span className="c-bottom-nav__icon-wrapper">
                  {isActive ? activeIcon : icon}
                </span>
                <span className="c-bottom-nav__label">{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
