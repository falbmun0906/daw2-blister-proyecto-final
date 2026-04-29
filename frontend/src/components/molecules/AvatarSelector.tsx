import { AVATAR_OPTIONS, getAvatarBackground } from '../../constants/avatars';

interface AvatarSelectorProps {
  currentAvatarKey?: string;
  onSelect: (avatarKey: string) => void;
}

/**
 * Cuadrícula seleccionable de avatares predefinidos.
 * El elemento marcado se resalta con un anillo de foco persistente.
 */
export function AvatarSelector({ currentAvatarKey, onSelect }: AvatarSelectorProps) {
  return (
    <div className="c-avatar-selector" role="radiogroup" aria-label="Elige un avatar">
      {AVATAR_OPTIONS.map((key) => {
        const isSelected = currentAvatarKey === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Avatar ${key.replace('avatar-minimal-', '')}`}
            className={[
              'c-avatar-selector__option',
              isSelected && 'c-avatar-selector__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ backgroundColor: getAvatarBackground(key) }}
            onClick={() => onSelect(key)}
          />
        );
      })}
    </div>
  );
}
