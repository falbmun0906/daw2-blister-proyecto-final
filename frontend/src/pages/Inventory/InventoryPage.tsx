import { useMemo, useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
import { MedicineCard } from '../../components/organisms/MedicineCard';
import { ROUTES } from '../../constants/routes';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import './InventoryPage.scss';

function filterMedicines(list: ReturnType<typeof useMedicines>['medicines'], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((medicine) => {
    const name = (medicine.alias?.trim() || medicine.nombre).toLowerCase();
    return (
      name.includes(q)
      || medicine.pactivos.toLowerCase().includes(q)
      || medicine.nregist.includes(q)
    );
  });
}

function InventoryPage() {
  usePageTitle('Botiquín');
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((state) => state.blisters);
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const activeRole = useBlisterStore((state) => state.activeRole);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const { medicines, isLoading, error, refetch } = useMedicines(blisterId);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const routeRole = useMemo(
    () => currentBlister?.members.find((member) => member.userId === userId)?.role ?? null,
    [currentBlister, userId],
  );
  const role = routeRole ?? (blisterId === activeBlisterId ? activeRole : null);
  const visible = useMemo(() => filterMedicines(medicines, ''), [medicines]);
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';

  if (!blisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  if (!blistersLoaded && blisters.length === 0) {
    return (
      <div className="c-inventory-page__list" aria-busy="true">
        <Skeleton height="4rem" />
        <Skeleton height="4rem" />
        <Skeleton height="4rem" />
      </div>
    );
  }

  return (
    <section className="c-inventory-page" aria-label="Botiquín">
      <CimaSearchDropdown
        blisterId={blisterId}
        canMutate={canMutate}
        searchInputRef={searchInputRef}
        ariaLabel="Buscar medicamento en CIMA"
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="c-inventory-page__list" aria-busy="true">
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Tu botiquín está vacío"
          description={
            canMutate
              ? 'Busca un medicamento en CIMA y pulsa + para añadirlo.'
              : 'Pide al administrador del blíster que añada medicamentos.'
          }
          ctaLabel={canMutate ? 'Buscar en CIMA' : undefined}
          onCtaClick={canMutate ? () => searchInputRef.current?.focus() : undefined}
        />
      ) : (
        <ul className="c-inventory-page__list">
          {visible.map((medicine) => (
            <li key={medicine._id} className="c-inventory-page__item">
              <MedicineCard medicine={medicine} blisterId={blisterId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default InventoryPage;
