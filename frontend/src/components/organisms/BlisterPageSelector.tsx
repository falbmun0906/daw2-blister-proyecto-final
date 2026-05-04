import { useEffect } from 'react';
import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import type { Blister } from '../../types/blister.types';
import { BlisterPillSelector } from './BlisterPillSelector';

function resolveCurrentRoute(pathname: string, blisterId: string): string {
  if (matchPath({ path: ROUTES.blisterTreatments(':blisterId'), end: true }, pathname)) {
    return ROUTES.blisterTreatments(blisterId);
  }
  if (matchPath({ path: ROUTES.blisterAppointments(':blisterId'), end: true }, pathname)) {
    return ROUTES.blisterAppointments(blisterId);
  }
  return ROUTES.blisterMedications(blisterId);
}

function resolveUserRole(blister: Blister, userId: string | null) {
  if (!userId) return null;
  return blister.members.find((member) => member.userId === userId)?.role ?? null;
}

export function BlisterPageSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const setActiveBlister = useBlisterStore((state) => state.setActiveBlister);
  const open = useUiStore((state) => state.blisterSelectorOpen);
  const closeSelector = useUiStore((state) => state.closeBlisterSelector);
  const blisterId = routeBlisterId ?? activeBlisterId;

  useEffect(() => () => closeSelector(), [closeSelector]);

  const handleSelect = (blister: Blister): void => {
    setActiveBlister(blister._id, resolveUserRole(blister, userId));
    closeSelector();
    navigate(resolveCurrentRoute(location.pathname, blister._id));
  };

  return (
    <div
      id="blister-page-selector"
      className={`c-blister-page-selector${open ? ' is-open' : ''}`}
      aria-hidden={!open}
    >
      <div className="c-blister-page-selector__inner">
        {blisters.length > 0 ? (
          <BlisterPillSelector
            blisters={blisters}
            activeBlisterId={blisterId}
            onCreate={() => {
              closeSelector();
              navigate(ROUTES.createBlister);
            }}
            onSelect={handleSelect}
          />
        ) : null}
      </div>
    </div>
  );
}
