import { lazy, Suspense, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TbCamera, TbSearch, TbWriting } from 'react-icons/tb';
import { ROUTES } from '../../constants/routes';
import { Button } from '../atoms/Button';
import { CimaSearchDropdown } from '../molecules/CimaSearchDropdown';

const MedicineScanner = lazy(() => import('./MedicineScanner'));

export function MedicineEntryOptions({ blisterId }: { blisterId: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const scan = params.get('mode') === 'scan';
  const state = location.state as { scanQuery?: string; captureMethod?: string } | null;
  const search = useRef<HTMLInputElement | null>(null);
  if (scan)
    return (
      <Suspense fallback={<p role="status">Preparando escáner…</p>}>
        <MedicineScanner
          blisterId={blisterId}
          initialQuery={state?.scanQuery ?? ''}
          initialMethod={
            state?.captureMethod === 'ocr' || state?.captureMethod === 'barcode'
              ? state.captureMethod
              : 'search'
          }
          onClose={() => navigate(ROUTES.addMedicine(blisterId), { replace: true })}
        />
      </Suspense>
    );
  return (
    <section className="c-add-medicine-page" aria-label="Añadir al botiquín">
      <p>Elige cómo identificar el producto. Podrás revisar los datos antes de añadirlo.</p>
      <div className="c-medicine-entry-options">
        <Button variant="secondary" fullWidth onClick={() => search.current?.focus()}>
          <TbSearch aria-hidden="true" /> Buscar medicamento
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate(`${ROUTES.addMedicine(blisterId)}?mode=scan`)}
        >
          <TbCamera aria-hidden="true" /> Escanear envase
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate(`${ROUTES.addMedicine(blisterId)}?source=custom`)}
        >
          <TbWriting aria-hidden="true" /> Crear producto personalizado
        </Button>
      </div>
      <CimaSearchDropdown blisterId={blisterId} canMutate searchInputRef={search} />
      <p className="c-add-medicine-page__placeholder">
        Puedes crear complementos como magnesio o melatonina y otros productos que quieras gestionar
        sin vincularlos a CIMA.
      </p>
    </section>
  );
}
