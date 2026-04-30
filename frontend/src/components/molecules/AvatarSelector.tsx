import { AVATAR_OPTIONS, getAvatarImage, getAvatarLabel } from '../../constants/avatars';

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
        const image = getAvatarImage(key);
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={getAvatarLabel(key)}
            className={[
              'c-avatar-selector__option',
              isSelected && 'c-avatar-selector__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(key)}
          >
            {image ? <img src={image} alt="" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
