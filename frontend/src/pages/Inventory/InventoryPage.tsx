import { useMemo, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { CimaSearchDropdown } from '../../components/molecules/CimaSearchDropdown';
import { BlisterPillSelector } from '../../components/organisms/BlisterPillSelector';
import { MedicineCard } from '../../components/organisms/MedicineCard';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import './InventoryPage.scss';

function filterMedicines(list: ReturnType<typeof useMedicines>['medicines'], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((m) => {
    const name = (m.alias?.trim() || m.nombre).toLowerCase();
    return (
      name.includes(q) ||
      m.pactivos.toLowerCase().includes(q) ||
      m.nregist.includes(q)
    );
  });
}

function InventoryPage() {
  usePageTitle('Botiquín');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId } = useParams<{ blisterId: string }>();
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const userId = useAuthStore((s) => s.user?.id ?? null);
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

      {blisters.length > 0 ? (
        <BlisterPillSelector
          blisters={blisters}
          activeBlisterId={blisterId}
          onCreate={() => navigate(ROUTES.createBlister)}
          onSelect={(b) => {
            const role = userId
              ? (b.members.find((m) => m.userId === userId)?.role ?? null)
              : null;
            setActiveBlister(b._id, role);
            navigate(ROUTES.blisterMedications(b._id));
          }}
        />
      ) : null}

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
          {visible.map((m) => (
            <li key={m._id} className="c-inventory-page__item">
              <MedicineCard medicine={m} blisterId={blisterId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default InventoryPage;
