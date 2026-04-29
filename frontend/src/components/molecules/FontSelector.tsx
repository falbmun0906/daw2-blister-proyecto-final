import type { UserSettings } from '../../types/auth.types';

type Font = UserSettings['font'];

interface FontSelectorProps {
  currentFont: Font;
  onChange: (font: Font) => void;
}

const OPTIONS: ReadonlyArray<{ value: Font; label: string; description: string }> = [
  { value: 'standard', label: 'Estándar', description: 'Tipografía Nunito' },
  { value: 'dyslexic', label: 'OpenDyslexic', description: 'Lectura facilitada' },
];

export function FontSelector({ currentFont, onChange }: FontSelectorProps) {
  return (
    <div className="c-font-selector" role="radiogroup" aria-label="Tipografía">
      {OPTIONS.map((option) => {
        const isSelected = option.value === currentFont;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={[
              'c-font-selector__option',
              isSelected && 'c-font-selector__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
          >
            <span className="c-font-selector__label">{option.label}</span>
            <span className="c-font-selector__hint">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
