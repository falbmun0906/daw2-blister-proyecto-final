import type { UserSettings } from '../../types/auth.types';

type Theme = UserSettings['theme'];

interface ThemeSelectorProps {
  currentTheme: Theme;
  onChange: (theme: Theme) => void;
}

const OPTIONS: ReadonlyArray<{ value: Theme; label: string; description: string }> = [
  { value: 'light', label: 'Claro', description: 'Fondo claro' },
  { value: 'dark', label: 'Oscuro', description: 'Fondo oscuro' },
  { value: 'system', label: 'Sistema', description: 'Sigue tu dispositivo' },
];

export function ThemeSelector({ currentTheme, onChange }: ThemeSelectorProps) {
  return (
    <div className="c-theme-selector" role="radiogroup" aria-label="Tema de color">
      {OPTIONS.map((option) => {
        const isSelected = option.value === currentTheme;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={[
              'c-theme-selector__option',
              isSelected && 'c-theme-selector__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
          >
            <span className="c-theme-selector__label">{option.label}</span>
            <span className="c-theme-selector__hint">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
