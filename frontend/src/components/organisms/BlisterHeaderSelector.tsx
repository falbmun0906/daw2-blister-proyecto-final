import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TbChevronDown } from 'react-icons/tb';

import { Avatar } from '../atoms/Avatar';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';

export function BlisterHeaderSelector() {
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const toggleSelector = useUiStore((state) => state.toggleBlisterSelector);
  const isOpen = useUiStore((state) => state.blisterSelectorOpen);

  const blisterId = routeBlisterId ?? activeBlisterId;
  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const visibleMembers = currentBlister?.members.slice(0, 2) ?? [];
  const extraMembers = Math.max(0, (currentBlister?.members.length ?? 0) - visibleMembers.length);

  return (
    <div className="c-blister-header-selector">
      <button
        type="button"
        className="c-blister-header-selector__trigger"
        aria-label={currentBlister ? `Cambiar blíster. Activo: ${currentBlister.name}` : 'Cambiar blíster'}
        aria-expanded={isOpen}
        aria-controls="blister-page-selector"
        onClick={toggleSelector}
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
    </div>
  );
}
