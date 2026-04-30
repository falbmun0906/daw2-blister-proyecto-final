import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbPill } from 'react-icons/tb';

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

/**
 * Buscador unificado contra la API CIMA con dropdown de resultados estilo
 * "mini-cards" (icono + nombre + dosis). Cuando el dropdown está abierto se
 * muestra un backdrop oscurecido detrás para dar foco a los resultados.
 *
 * - Click en el cuerpo de la card → navega a la ficha del medicamento.
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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    setError(null);
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

  const handleSelect = (item: ExternalSearchItem) => {
    setIsOpen(false);
    if (canMutate) {
      // Click directo en una mini-card → flujo de alta con `nregist` precargado.
      navigate(`${ROUTES.addMedicine(blisterId)}?nregist=${encodeURIComponent(item.nregist)}`);
    } else {
      // Sin permisos de mutación, dirigimos a la ficha CIMA solo lectura.
      navigate(ROUTES.cimaMedicineDetail(item.nregist));
    }
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
          onChange={setQuery}
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
                      onClick={() => handleSelect(item)}
                      aria-label={canMutate
                        ? `Añadir ${item.nombre} al botiquín`
                        : `Ver ficha de ${item.nombre}`}
                    >
                      <span className="c-cima-search__item-icon" aria-hidden="true">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              // Si la imagen falla, ocultamos el <img> y caemos al icono.
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <TbPill />
                        )}
                      </span>
                      <span className="c-cima-search__item-text">
                        <span className="c-cima-search__item-name">{item.nombre}</span>
                        {dose ? (
                          <span className="c-cima-search__item-meta">{dose}</span>
                        ) : null}
                      </span>
                    </button>
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
