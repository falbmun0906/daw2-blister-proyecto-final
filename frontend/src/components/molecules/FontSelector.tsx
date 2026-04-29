import type { UserSettings } from '../../types/auth.types';

type Font = UserSettings['font'];

interface FontSelectorProps {
  currentFont: Font;
  onChange: (font: Font) => void;
}

/**
 * Toggle binario para activar la tipografía de dislexia.
 *
 * El selector original ofrecía dos botones, pero la pantalla de
 * accesibilidad muestra esta opción como un interruptor activado/desactivado
 * con etiqueta y descripción.
 */
export function FontSelector({ currentFont, onChange }: FontSelectorProps) {
  const isDyslexic = currentFont === 'dyslexic';

  const handleToggle = (): void => {
    onChange(isDyslexic ? 'standard' : 'dyslexic');
  };

  return (
    <div className="c-font-selector">
      <div className="c-font-selector__copy">
        <p className="c-font-selector__title">Fuente para dislexia</p>
        <p className="c-font-selector__description">
          Cambia la tipografía a una diseñada para facilitar la lectura.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDyslexic}
        aria-label="Activar tipografía para dislexia"
        className={[
          'c-font-selector__switch',
          isDyslexic && 'c-font-selector__switch--on',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleToggle}
      >
        <span className="c-font-selector__switch-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
