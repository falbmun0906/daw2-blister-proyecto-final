import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaHandPointUp } from 'react-icons/fa6';
import { TbChevronDown } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';

const BLISTER_SELECTOR_TIP_STORAGE_KEY = 'blister-header-selector-tip';

function buildTipKey(userId: string | null): string | null {
  return userId ? `${BLISTER_SELECTOR_TIP_STORAGE_KEY}:${userId}` : null;
}

export function BlisterHeaderSelector() {
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const toggleSelector = useUiStore((state) => state.toggleBlisterSelector);
  const isOpen = useUiStore((state) => state.blisterSelectorOpen);
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
    if (!tipKey || isOpen || blisters.length < 2) {
      setShowTip(false);
      return;
    }
    if (window.localStorage.getItem(tipKey) === '1') {
      setShowTip(false);
      return;
    }
    setShowTip(true);
  }, [blisters.length, isOpen, userId]);

  const dismissTip = (): void => {
    const tipKey = buildTipKey(userId);
    if (tipKey) {
      window.localStorage.setItem(tipKey, '1');
    }
    setShowTip(false);
  };

  return (
    <div className="c-blister-header-selector">
      <button
        type="button"
        className="c-blister-header-selector__trigger"
        aria-label={currentBlister ? `Cambiar blíster. Activo: ${currentBlister.name}` : 'Cambiar blíster'}
        aria-expanded={isOpen}
        aria-controls="blister-page-selector"
        onClick={() => {
          dismissTip();
          toggleSelector();
        }}
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
        <TbChevronDown
          className={`c-blister-header-selector__chevron${isOpen ? ' is-open' : ''}`}
          aria-hidden="true"
        />
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
            <FaHandPointUp className="c-blister-header-selector__coachmark-hand" aria-hidden="true" />
            <p className="c-blister-header-selector__coachmark-title">Cambia aquí de blíster</p>
            <p className="c-blister-header-selector__coachmark-copy">
              Pulsa este botón para desplegar el selector sin salir de la pantalla.
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
  );
}
