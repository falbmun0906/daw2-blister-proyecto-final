import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbPill, TbPlus } from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import { searchCima } from '../../services/external.service';
import { isApiError } from '../../types/api.types';
import type { ExternalSearchItem } from '../../types/medicine.types';
import { SearchBar } from './SearchBar';

interface CimaSearchDropdownProps {
  /** Blíster donde se añadirá el medicamento al pulsar la mini-card. */
  blisterId: string;
  /** Solo OWNER/CAREGIVER pueden añadir; OBSERVER ve el dropdown deshabilitado. */
  canMutate: boolean;
  /** Permite registrar el ref del input de búsqueda (focus desde el padre). */
  searchInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/** Devuelve la dosis o forma farmacéutica más representativa para mostrar
 *  como subtítulo en la mini-card de un resultado CIMA. */
function formatDose(item: ExternalSearchItem): string {
  const parts = [item.dosisOficial, item.formaOficial].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(' · ');
  return item.pactivos || '';
}

function CimaResultIcon({ fotoUrl }: { fotoUrl?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(fotoUrl && !imageFailed);

  return (
    <span
      className={[
        'c-cima-search__item-icon',
        !showImage && 'c-cima-search__item-icon--fallback',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={fotoUrl ?? undefined}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <TbPill />
      )}
    </span>
  );
}

/**
 * Buscador unificado contra la API CIMA con dropdown de resultados estilo
 * "mini-cards" (icono + nombre + dosis). Cuando el dropdown está abierto se
 * muestra un backdrop oscurecido detrás para dar foco a los resultados.
 *
 * - Click en la card → ficha oficial CIMA.
 * - Click en el botón `+` → flujo de alta con `nregist` preseleccionado.
 */
export function CimaSearchDropdown({
  blisterId,
  canMutate,
  searchInputRef,
  className,
  placeholder = 'Buscar medicamento',
  ariaLabel = 'Buscar medicamento en CIMA',
}: CimaSearchDropdownProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExternalSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleQueryChange = useCallback((value: string): void => {
    const trimmed = value.trim();
    setQuery(value);
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    setError(null);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    searchCima(trimmed)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'No se ha podido buscar en CIMA.');
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Cierra el dropdown al hacer click fuera del componente.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Cierra el dropdown con Escape para mejorar accesibilidad.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleViewDetail = (item: ExternalSearchItem) => {
    setIsOpen(false);
    navigate(ROUTES.cimaMedicineDetail(item.nregist), {
      state: { parentRoute: ROUTES.blisterMedications(blisterId) },
    });
  };

  const handleAdd = (item: ExternalSearchItem) => {
    setIsOpen(false);
    navigate(`${ROUTES.addMedicine(blisterId)}?nregist=${encodeURIComponent(item.nregist)}`, {
      state: { parentRoute: ROUTES.blisterMedications(blisterId) },
    });
  };

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div
      ref={containerRef}
      className={['c-cima-search', showDropdown && 'is-open', className].filter(Boolean).join(' ')}
    >
      {showDropdown ? (
        <div
          className="c-cima-search__backdrop"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div className="c-cima-search__field">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          enableVoice
          inputRef={searchInputRef}
        />
      </div>

      {showDropdown ? (
        <div className="c-cima-search__dropdown" role="listbox" aria-label="Resultados CIMA">
          {error ? (
            <p className="c-cima-search__msg c-cima-search__msg--error">{error}</p>
          ) : isSearching ? (
            <div className="c-cima-search__loading" role="status" aria-label="Buscando">
              <span className="c-cima-search__spinner" aria-hidden="true" />
            </div>
          ) : results.length === 0 ? (
            <p className="c-cima-search__msg">Sin resultados.</p>
          ) : (
            <ul className="c-cima-search__list">
              {results.slice(0, 8).map((item) => {
                const dose = formatDose(item);
                return (
                  <li key={item.nregist} className="c-cima-search__item">
                    <button
                      type="button"
                      className="c-cima-search__item-body"
                      onClick={() => handleViewDetail(item)}
                      aria-label={`Ver ficha de ${item.nombre}`}
                    >
                      <CimaResultIcon fotoUrl={item.fotoUrl} />
                      <span className="c-cima-search__item-text">
                        <span className="c-cima-search__item-name">{item.nombre}</span>
                        {dose ? (
                          <span className="c-cima-search__item-meta">{dose}</span>
                        ) : null}
                      </span>
                    </button>
                    {canMutate ? (
                      <button
                        type="button"
                        className="c-cima-search__add"
                        onClick={() => handleAdd(item)}
                        aria-label={`Añadir ${item.nombre} al botiquín`}
                      >
                        <TbPlus aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
