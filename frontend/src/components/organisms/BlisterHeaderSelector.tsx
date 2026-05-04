import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TbChevronDown } from 'react-icons/tb';

import { Modal } from '../atoms/Modal';
import { Avatar } from '../atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import type { Blister } from '../../types/blister.types';
import { BlisterPillSelector } from './BlisterPillSelector';

const BLISTER_SELECTOR_TIP_STORAGE_KEY = 'blister-header-selector-tip';

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

function buildTipKey(userId: string | null): string | null {
  return userId ? `${BLISTER_SELECTOR_TIP_STORAGE_KEY}:${userId}` : null;
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
  const [showTip, setShowTip] = useState(false);

  const blisterId = routeBlisterId ?? activeBlisterId;
  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const visibleMembers = currentBlister?.members.slice(0, 2) ?? [];
  const extraMembers = Math.max(0, (currentBlister?.members.length ?? 0) - visibleMembers.length);

  useEffect(() => {
    const tipKey = buildTipKey(userId);
    if (!tipKey || open || blisters.length < 2) {
      setShowTip(false);
      return;
    }

    if (window.localStorage.getItem(tipKey) === '1') {
      setShowTip(false);
      return;
    }

    setShowTip(true);
  }, [blisters.length, open, userId]);

  const dismissTip = (): void => {
    const tipKey = buildTipKey(userId);
    if (tipKey) {
      window.localStorage.setItem(tipKey, '1');
    }
    setShowTip(false);
  };

  const handleOpen = (): void => {
    dismissTip();
    setOpen(true);
  };

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
          onClick={handleOpen}
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

        {showTip ? (
          <div className="c-blister-header-selector__coachmark" role="presentation">
            <button
              type="button"
              className="c-blister-header-selector__coachmark-backdrop"
              aria-label="Cerrar ayuda del selector de blíster"
              onClick={dismissTip}
            />
            <div className="c-blister-header-selector__coachmark-bubble" role="note" aria-live="polite">
              <span className="c-blister-header-selector__coachmark-hand" aria-hidden="true">
                👆
              </span>
              <p className="c-blister-header-selector__coachmark-title">Cambia aquí de blíster</p>
              <p className="c-blister-header-selector__coachmark-copy">
                Desde este botón puedes ver otro blíster sin salir de la pantalla.
              </p>
              <button
                type="button"
                className="c-blister-header-selector__coachmark-cta"
                onClick={dismissTip}
              >
                Entendido
              </button>
            </div>
          </div>
        ) : null}
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
