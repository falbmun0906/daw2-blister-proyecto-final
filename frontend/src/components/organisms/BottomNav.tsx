import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';

import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

/** Iconos inline para no añadir dependencias. */
const HomeIcon = (
  <svg className="c-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const PillIcon = (
  <svg className="c-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.5 20.5a7 7 0 0 1-9.9-9.9l9.9-9.9a7 7 0 0 1 9.9 9.9Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

const TreatmentIcon = (
  <svg className="c-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M9 12h6M12 9v6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CalendarIcon = (
  <svg className="c-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

/** Barra inferior de navegación primaria. */
export function BottomNav() {
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);

  const items: NavItem[] = [
    { to: ROUTES.home, label: 'Inicio', icon: HomeIcon },
    {
      to: activeBlisterId ? ROUTES.blisterMedications(activeBlisterId) : ROUTES.blisters,
      label: 'Botiquín',
      icon: PillIcon,
    },
    {
      to: activeBlisterId ? ROUTES.blisterTreatments(activeBlisterId) : ROUTES.blisters,
      label: 'Tratamientos',
      icon: TreatmentIcon,
    },
    {
      to: activeBlisterId ? ROUTES.blisterAppointments(activeBlisterId) : ROUTES.blisters,
      label: 'Calendario',
      icon: CalendarIcon,
    },
  ];

  return (
    <nav className="c-bottom-nav" aria-label="Navegación principal">
      {items.map(({ to, label, icon }) => (
        <NavLink
          key={label}
          to={to}
          end={to === ROUTES.home}
          className={({ isActive }) =>
            ['c-bottom-nav__item', isActive && 'is-active'].filter(Boolean).join(' ')
          }
        >
          {icon}
          <span className="c-bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
