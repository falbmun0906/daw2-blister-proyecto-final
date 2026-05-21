import type { ReactNode } from 'react';
import { TbSun, TbMoon, TbDeviceDesktop } from 'react-icons/tb';

import type { UserSettings } from '../../types/auth.types';

type Theme = UserSettings['theme'];

interface ThemeSelectorProps {
  currentTheme: Theme;
  onChange: (theme: Theme) => void;
}

const OPTIONS: ReadonlyArray<{ value: Theme; label: string; icon: ReactNode }> = [
  { value: 'light', label: 'Claro', icon: <TbSun aria-hidden="true" /> },
  { value: 'dark', label: 'Oscuro', icon: <TbMoon aria-hidden="true" /> },
  { value: 'system', label: 'Sistema', icon: <TbDeviceDesktop aria-hidden="true" /> },
];

export function ThemeSelector({ currentTheme, onChange }: ThemeSelectorProps) {
  return (
    <div className="c-theme-selector" role="radiogroup" aria-label="Modo de pantalla">
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
            <span className="c-theme-selector__icon" aria-hidden="true">
              {option.icon}
            </span>
            <span className="c-theme-selector__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
