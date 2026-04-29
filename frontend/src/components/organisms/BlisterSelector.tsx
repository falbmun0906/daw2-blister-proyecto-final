import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../atoms/Button';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import type { Blister, BlisterRole } from '../../types/blister.types';
import { RoleBadge } from '../molecules/RoleBadge';

interface BlisterSelectorProps {
  onClose: () => void;
}

function resolveRole(blister: Blister, userId: string | null): BlisterRole | null {
  if (!userId) return null;
  return blister.members.find((m) => m.userId === userId)?.role ?? null;
}

/**
 * Bottom sheet con la lista de blísters del usuario.
 * Permite cambiar el blíster activo o ir a la pantalla de gestión.
 */
export function BlisterSelector({ onClose }: BlisterSelectorProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSelect = (blister: Blister) => {
    setActiveBlister(blister._id, resolveRole(blister, userId));
    onClose();
  };

  const handleManage = () => {
    onClose();
    navigate(ROUTES.blisters);
  };

  return (
    <div
      className="c-blister-selector"
      role="dialog"
      aria-modal="true"
      aria-label="Selecciona un blíster"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="c-blister-selector__sheet">
        <div className="c-blister-selector__header">
          <h2 className="c-blister-selector__title">Mis blísters</h2>
          <button
            type="button"
            className="c-blister-selector__close"
            aria-label="Cerrar selector"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        {blisters.length === 0 ? (
          <p className="c-blister-selector__meta">
            Todavía no tienes ningún blíster. Crea uno o únete con un código.
          </p>
        ) : (
          <ul className="c-blister-selector__list">
            {blisters.map((blister) => {
              const role = resolveRole(blister, userId);
              const isActive = blister._id === activeBlisterId;
              return (
                <li key={blister._id}>
                  <button
                    type="button"
                    className={['c-blister-selector__item', isActive && 'is-active'].filter(Boolean).join(' ')}
                    onClick={() => handleSelect(blister)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="c-blister-selector__avatar" aria-hidden="true">
                      <svg className="c-blister-selector__avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 11 9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                      </svg>
                    </span>
                    <span>
                      <span className="c-blister-selector__name">{blister.name}</span>
                      <p className="c-blister-selector__meta">
                        {blister.members.length} miembro{blister.members.length === 1 ? '' : 's'}
                      </p>
                    </span>
                    {role ? <RoleBadge role={role} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="c-blister-selector__actions">
          <Button type="button" variant="primary" fullWidth onClick={handleManage}>
            Gestionar blísters
          </Button>
          <Link to={ROUTES.createBlister} onClick={onClose} className="c-btn c-btn--ghost c-btn--full">
            Crear nuevo blíster
          </Link>
        </div>
      </div>
    </div>
  );
}
