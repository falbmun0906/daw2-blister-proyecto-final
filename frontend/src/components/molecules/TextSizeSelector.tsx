import type { UserSettings } from '../../types/auth.types';

type FontSize = UserSettings['fontSize'];

interface TextSizeSelectorProps {
  currentSize: FontSize;
  onChange: (size: FontSize) => void;
}

const OPTIONS: ReadonlyArray<{ value: FontSize; label: string; sample: string }> = [
  { value: 'normal', label: 'Normal', sample: 'Aa' },
  { value: 'large', label: 'Grande', sample: 'Aa' },
  { value: 'xlarge', label: 'Muy grande', sample: 'Aa' },
];

export function TextSizeSelector({ currentSize, onChange }: TextSizeSelectorProps) {
  return (
    <div className="c-text-size-selector" role="radiogroup" aria-label="Tamaño del texto">
      {OPTIONS.map((option) => {
        const isSelected = option.value === currentSize;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={[
              'c-text-size-selector__option',
              `c-text-size-selector__option--${option.value}`,
              isSelected && 'c-text-size-selector__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
          >
            <span className="c-text-size-selector__sample" aria-hidden="true">
              {option.sample}
            </span>
            <span className="c-text-size-selector__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
