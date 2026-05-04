import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Avatar } from '../atoms/Avatar';
import type { Blister, BlisterRole } from '../../types/blister.types';

interface BlisterPillSelectorProps {
  blisters: Blister[];
  activeBlisterId: string | null;
  onSelect: (blister: Blister) => void;
  onCreate?: () => void;
  variant?: 'default' | 'terracotta';
  /**
   * Devuelve el avatarKey almacenado en el usuario miembro del blíster, si está
   * disponible. La página llamadora suele tener ese mapeo.
   */
  resolveAvatarKey?: (userId: string) => string | undefined;
  /**
   * Devuelve el rol de un usuario dentro del blíster activo (informativo).
   * Reservado para iteraciones futuras.
   */
  resolveRole?: (blister: Blister, userId: string) => BlisterRole | null;
}

/**
 * Selector horizontal de blísters con animación de fondo deslizante.
 *
 * Muestra cada blíster como una "píldora" (chip) con:
 *   - Stack de avatares de los miembros (máx 3 visibles + “+N”).
 *   - Nombre del blíster.
 *
 * Al cambiar de blíster, un fondo coloreado se desplaza con animación CSS
 * suave hacia la opción seleccionada (similar a un segmented control).
 */
export function BlisterPillSelector({
  blisters,
  activeBlisterId,
  onSelect,
  onCreate,
  resolveAvatarKey,
  variant = 'default',
}: BlisterPillSelectorProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const slots = useMemo(
    () => Array.from({ length: 3 }, (_, index) => blisters[index] ?? null),
    [blisters],
  );

  // Posiciona el indicador deslizante sobre el item activo.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeIdx = slots.findIndex((b) => b?._id === activeBlisterId);
    if (activeIdx < 0) {
      setIndicator(null);
      return;
    }
    const items = list.querySelectorAll<HTMLElement>(':scope > .c-blister-pill-selector__item');
    const node = items.item(activeIdx);
    if (!node) return;
    setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
  }, [activeBlisterId, slots]);

  return (
    <div
      className={[
        'c-blister-pill-selector',
        variant === 'terracotta' && 'c-blister-pill-selector--terracotta',
      ].filter(Boolean).join(' ')}
      role="tablist"
      aria-label="Cambiar de blíster"
    >
      <ul className="c-blister-pill-selector__list" ref={listRef}>
        {indicator ? (
          <span
            className="c-blister-pill-selector__indicator"
            aria-hidden="true"
            style={{ left: `${indicator.left}px`, width: `${indicator.width}px` }}
          />
        ) : null}

        {slots.map((blister, index) => {
          if (!blister) {
            return (
              <li key={`placeholder-${index}`} className="c-blister-pill-selector__item c-blister-pill-selector__item--placeholder">
                <button
                  type="button"
                  className="c-blister-pill-selector__placeholder"
                  onClick={onCreate}
                  disabled={!onCreate}
                >
                  <span className="c-blister-pill-selector__placeholder-icon" aria-hidden="true">+</span>
                  <span>Nuevo blíster</span>
                </button>
              </li>
            );
          }

          const isActive = blister._id === activeBlisterId;
          const visibleMembers = blister.members.slice(0, 2);
          const hasExtra = blister.members.length >= 3;

          return (
            <li key={blister._id} className="c-blister-pill-selector__item">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={[
                  'c-blister-pill-selector__pill',
                  isActive && 'is-active',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelect(blister)}
              >
                <span className="c-blister-pill-selector__stack" aria-hidden="true">
                  {visibleMembers.map((member, idx) => (
                    <span
                      key={member.userId}
                      className="c-blister-pill-selector__stack-avatar"
                      style={{ zIndex: visibleMembers.length - idx }}
                    >
                      <Avatar
                        name={member.fullName?.trim() ?? ''}
                        avatarKey={member.avatarKey ?? resolveAvatarKey?.(member.userId)}
                        size="sm"
                      />
                    </span>
                  ))}
                  {hasExtra ? (
                    <span className="c-blister-pill-selector__stack-extra">+</span>
                  ) : null}
                </span>
                <span className="c-blister-pill-selector__name">{blister.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
