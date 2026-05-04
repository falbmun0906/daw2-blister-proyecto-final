import { useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TbChevronDown } from 'react-icons/tb';

import { Modal } from '../atoms/Modal';
import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
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

export function BlisterHeaderSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const setActiveBlister = useBlisterStore((state) => state.setActiveBlister);
  const [open, setOpen] = useState(false);

  const blisterId = routeBlisterId ?? activeBlisterId;
  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const visibleMembers = currentBlister?.members.slice(0, 2) ?? [];
  const extraMembers = Math.max(0, (currentBlister?.members.length ?? 0) - visibleMembers.length);

  const handleSelect = (blister: Blister): void => {
    setActiveBlister(blister._id, resolveUserRole(blister, userId));
    setOpen(false);
    navigate(resolveCurrentRoute(location.pathname, blister._id));
  };

  return (
    <>
      <div className="c-blister-header-selector">
        <button
          type="button"
          className="c-blister-header-selector__trigger"
          aria-label={currentBlister ? `Cambiar blíster. Activo: ${currentBlister.name}` : 'Cambiar blíster'}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className="c-blister-header-selector__stack" aria-hidden="true">
            {visibleMembers.map((member, index) => (
              <span
                key={member.userId}
                className="c-blister-header-selector__avatar"
                style={{ zIndex: visibleMembers.length - index }}
              >
                <Avatar
                  name={member.fullName?.trim() || member.username?.trim() || currentBlister?.name || 'Miembro'}
                  avatarKey={member.avatarKey ?? undefined}
                  size="sm"
                />
              </span>
            ))}
            {extraMembers > 0 ? (
              <span className="c-blister-header-selector__extra">+{extraMembers}</span>
            ) : null}
          </span>
          <TbChevronDown className="c-blister-header-selector__chevron" aria-hidden="true" />
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Seleccionar blíster"
        className="c-modal--blister-selector"
        panelClassName="c-modal__panel--blister-selector"
        bodyClassName="c-modal__body--blister-selector"
      >
        <div className="c-blister-header-selector__modal-copy">
          <p className="c-blister-header-selector__modal-kicker">Contexto activo</p>
          <p className="c-blister-header-selector__modal-title">
            Elige el blíster que quieres consultar ahora.
          </p>
        </div>
        <BlisterPillSelector
          blisters={blisters}
          activeBlisterId={blisterId}
          onCreate={() => {
            setOpen(false);
            navigate(ROUTES.createBlister);
          }}
          onSelect={handleSelect}
        />
      </Modal>
    </>
  );
}
