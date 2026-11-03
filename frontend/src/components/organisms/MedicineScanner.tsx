import { useNavigate } from 'react-router-dom';
import { useMedicineScanner } from '../../hooks/use.medicine-scanner';
import { getNameSuggestions } from '../../lib/medicine-recognition';
import { ROUTES } from '../../constants/routes';
import { MedicinePhotoCrop } from '../molecules/MedicinePhotoCrop';
import { Button } from '../atoms/Button';
import { ErrorState } from '../atoms/ErrorState';
import { Input } from '../atoms/Input';

export default function MedicineScanner({
  blisterId,
  onClose,
  initialQuery = '',
  initialMethod = 'search',
}: {
  blisterId: string;
  onClose: () => void;
  initialQuery?: string;
  initialMethod?: 'ocr' | 'barcode' | 'search';
}) {
  const navigate = useNavigate();
  const {
    preview,
    crop,
    setCrop,
    busy,
    searching,
    progress,
    error,
    text,
    query,
    method,
    searched,
    results,
    cancel,
    openCamera,
    selectPhoto,
    capture,
    recognize,
    search,
    changeQuery,
    video,
    camera,
    cameraPending,
  } = useMedicineScanner(initialQuery, initialMethod);
  return (
    <section className="c-medicine-scanner" aria-label="Escanear envase">
      <p>
        Fotografía el nombre o el código del envase con buena luz. La imagen se procesa en tu
        dispositivo y se descarta al salir. Revisa siempre el resultado.
      </p>
      {error ? <ErrorState message={error} /> : null}
      <div className="c-medicine-scanner__actions">
        <Button onClick={() => void openCamera()} disabled={busy || cameraPending}>
          {cameraPending ? 'Esperando permiso…' : 'Abrir cámara'}
        </Button>
        <label className="c-field">
          <span className="c-field__label">Elegir fotografía</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void selectPhoto(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {camera ? (
        <>
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className="c-medicine-scanner__video"
            aria-label="Vista de la cámara"
          />
          <Button onClick={capture}>Tomar fotografía</Button>
        </>
      ) : null}
      {preview && !camera ? (
        <>
          <MedicinePhotoCrop preview={preview} crop={crop} onChange={setCrop} disabled={busy} />
          <Button onClick={() => void recognize()} loading={busy}>
            Leer etiqueta o código
          </Button>
        </>
      ) : null}
      {busy ? (
        <div role="status">
          <p>
            {progress
              ? `Leyendo etiqueta: ${Math.round(progress * 100)} %`
              : 'Preparando el lector. La primera lectura puede tardar mientras se descarga el motor.'}
          </p>
          <progress max={1} value={progress || undefined} aria-label="Progreso de lectura" />
        </div>
      ) : null}
      {busy || camera || cameraPending || searching ? (
        <Button variant="secondary" onClick={cancel}>
          Cancelar operación
        </Button>
      ) : null}
      {!busy && !camera && !cameraPending ? (
        <>
          {text ? (
            <details>
              <summary>Revisar texto leído</summary>
              <p className="c-medicine-scanner__text">{text}</p>
            </details>
          ) : null}
          {getNameSuggestions(text).length > 1 ? (
            <div className="c-medicine-scanner__suggestions" aria-label="Textos detectados">
              {getNameSuggestions(text).map((name) => (
                <Button key={name} variant="secondary" onClick={() => changeQuery(name)}>
                  {name}
                </Button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <Input
              label="Nombre o Código Nacional (6 cifras)"
              value={query}
              maxLength={100}
              onChange={(event) => changeQuery(event.target.value)}
              hint="Corrige el texto antes de buscar. No se enviará la fotografía."
            />
            <Button type="submit" loading={searching} disabled={query.trim().length < 2}>
              Buscar coincidencias en CIMA
            </Button>
          </form>
          {searched && !results.length ? (
            <p role="status">
              No hay coincidencias en la búsqueda de medicamentos autorizados y comercializados.
              Revisa el nombre o prueba con el Código Nacional. Esto no determina el tipo de
              producto.
            </p>
          ) : null}
          {results.length ? (
            <>
              <p>
                Comprueba nombre, concentración y formato. Selecciona una coincidencia para revisar
                el alta.
              </p>
              <ul className="c-medicine-scanner__results">
                {results.map((item) => (
                  <li key={item.nregist}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        cancel();
                        navigate(
                          `${ROUTES.addMedicine(blisterId)}?nregist=${encodeURIComponent(item.nregist)}${item.cn ? `&cn=${encodeURIComponent(item.cn)}` : ''}`,
                          { state: { captureMethod: method, scanQuery: query } },
                        );
                      }}
                    >
                      <span>
                        {item.nombre}
                        <small>
                          {[
                            item.dosisOficial,
                            item.formaOficial,
                            item.presentationName,
                            item.cn ? `CN ${item.cn}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              cancel();
              navigate(`${ROUTES.addMedicine(blisterId)}?source=custom`, {
                state: {
                  scanQuery: query,
                  scanName: /^\d+$/.test(query) ? '' : query,
                  fromPhoto: Boolean(preview),
                  captureMethod: method,
                },
              });
            }}
          >
            Crear producto personalizado
          </Button>
        </>
      ) : null}
      <Button
        variant="ghost"
        onClick={() => {
          cancel();
          onClose();
        }}
      >
        Volver a las opciones de alta
      </Button>
    </section>
  );
}
