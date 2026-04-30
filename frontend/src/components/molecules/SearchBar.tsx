import { useEffect, useId, useRef, useState } from 'react';
import { TbSearch, TbX, TbMicrophone, TbMicrophoneOff } from 'react-icons/tb';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
  /** Activa el botón de dictado por voz (Web Speech API). */
  enableVoice?: boolean;
  /** Ref opcional para enfocar el input desde el padre. */
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

// Tipos mínimos para Web Speech API (no están en lib.dom estándar de TS).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Input de búsqueda controlado con debounce. El callback `onChange` se
 * invoca con el valor estabilizado (por defecto 300 ms) o inmediatamente
 * cuando el usuario pulsa el botón de limpieza.
 *
 * Si `enableVoice` está activo y el navegador soporta Web Speech API,
 * muestra un botón de micrófono que dicta texto en el input.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar…',
  ariaLabel = 'Buscar',
  debounceMs = 300,
  autoFocus = false,
  className,
  enableVoice = false,
  inputRef,
}: SearchBarProps) {
  const inputId = useId();
  const [internal, setInternal] = useState(value);
  const [isListening, setIsListening] = useState(false);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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

  const Recognition = enableVoice ? getSpeechRecognition() : null;
  const voiceSupported = !!Recognition;

  const handleVoice = () => {
    if (!Recognition) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInternal(transcript);
        onChange(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className={['c-search-bar', className].filter(Boolean).join(' ')}>
      <span className="c-search-bar__icon" aria-hidden="true">
        <TbSearch className="c-icon c-icon--sm" aria-hidden="true" />
      </span>
      <input
        id={inputId}
        ref={(node) => {
          if (inputRef) inputRef.current = node;
        }}
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
          <TbX className="c-icon c-icon--sm" aria-hidden="true" />
        </button>
      ) : enableVoice && voiceSupported ? (
        <button
          type="button"
          className={[
            'c-search-bar__voice',
            isListening && 'is-listening',
          ].filter(Boolean).join(' ')}
          onClick={handleVoice}
          aria-label={isListening ? 'Detener dictado' : 'Buscar por voz'}
          aria-pressed={isListening}
        >
          {isListening ? (
            <TbMicrophoneOff className="c-icon c-icon--sm" aria-hidden="true" />
          ) : (
            <TbMicrophone className="c-icon c-icon--sm" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
