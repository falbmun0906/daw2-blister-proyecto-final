import { useLayoutEffect, useRef, useState } from 'react';

import { Avatar } from '../atoms/Avatar';
import type { Blister, BlisterRole } from '../../types/blister.types';

interface BlisterPillSelectorProps {
  blisters: Blister[];
  activeBlisterId: string | null;
  onSelect: (blister: Blister) => void;
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
  resolveAvatarKey,
}: BlisterPillSelectorProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Posiciona el indicador deslizante sobre el item activo.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeIdx = blisters.findIndex((b) => b._id === activeBlisterId);
    if (activeIdx < 0) {
      setIndicator(null);
      return;
    }
    const node = list.children.item(activeIdx) as HTMLElement | null;
    if (!node) return;
    setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
  }, [activeBlisterId, blisters]);

  return (
    <div className="c-blister-pill-selector" role="tablist" aria-label="Cambiar de blíster">
      <ul className="c-blister-pill-selector__list" ref={listRef}>
        {indicator ? (
          <span
            className="c-blister-pill-selector__indicator"
            aria-hidden="true"
            style={{ left: `${indicator.left}px`, width: `${indicator.width}px` }}
          />
        ) : null}

        {blisters.map((blister) => {
          const isActive = blister._id === activeBlisterId;
          // Mostramos como máximo 2 avatares; el resto se agrupa en una
          // píldora circular "+N" (mismo lenguaje visual que en BlisterListPage).
          const visibleMembers = blister.members.slice(0, 2);
          const extra = blister.members.length - visibleMembers.length;

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
                        name={member.userId}
                        avatarKey={resolveAvatarKey?.(member.userId)}
                        size="sm"
                      />
                    </span>
                  ))}
                  {extra > 0 ? (
                    <span className="c-blister-pill-selector__stack-extra">+{extra}</span>
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
