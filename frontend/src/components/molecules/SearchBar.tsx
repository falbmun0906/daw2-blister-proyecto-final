import { useEffect, useId, useRef, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Input de búsqueda controlado con debounce. El callback `onChange` se
 * invoca con el valor estabilizado (por defecto 300 ms) o inmediatamente
 * cuando el usuario pulsa el botón de limpieza.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar…',
  ariaLabel = 'Buscar',
  debounceMs = 300,
  autoFocus = false,
  className,
}: SearchBarProps) {
  const inputId = useId();
  const [internal, setInternal] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (internal !== value) onChange(internal);
    }, debounceMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [internal, value, onChange, debounceMs]);

  const handleClear = () => {
    setInternal('');
    onChange('');
  };

  return (
    <div className={['c-search-bar', className].filter(Boolean).join(' ')}>
      <span className="c-search-bar__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width={18} height={18}>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id={inputId}
        className="c-search-bar__input"
        type="search"
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
      />
      {internal ? (
        <button
          type="button"
          className="c-search-bar__clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
