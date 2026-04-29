import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FaBriefcaseMedical } from 'react-icons/fa6';

import { ROUTES } from '../../constants/routes';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { SearchBar } from '../../components/molecules/SearchBar';
import { BlisterPillSelector } from '../../components/organisms/BlisterPillSelector';
import { MedicineCard } from '../../components/organisms/MedicineCard';
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
  const blisters = useBlisterStore((s) => s.blisters);
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { medicines, isLoading, error, refetch } = useMedicines();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => filterMedicines(medicines, query), [medicines, query]);
  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';

  if (!activeBlisterId) {
    return <Navigate to={ROUTES.blisters} replace />;
  }

  return (
    <section className="c-inventory-page" aria-labelledby="inventory-title">
      <header className="c-inventory-page__header">
        <span className="c-inventory-page__icon" aria-hidden="true">
          <FaBriefcaseMedical className="c-icon c-icon--md" aria-hidden="true" />
        </span>
        <h1 id="inventory-title" className="c-inventory-page__title">Botiquín</h1>
        <span className="c-inventory-page__spacer" aria-hidden="true" />
      </header>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar medicamento"
        ariaLabel="Buscar medicamentos del botiquín"
        enableVoice
      />

      {blisters.length > 0 ? (
        <BlisterPillSelector
          blisters={blisters}
          activeBlisterId={activeBlisterId}
          onSelect={(b) => {
            const role = userId
              ? (b.members.find((m) => m.userId === userId)?.role ?? null)
              : null;
            setActiveBlister(b._id, role);
          }}
        />
      ) : null}

      <h2 className="c-inventory-page__section-title">Medicamentos</h2>

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
          title={query ? 'Sin resultados' : 'Tu botiquín está vacío'}
          description={
            query
              ? 'Prueba con otro término de búsqueda.'
              : 'Añade tu primer medicamento desde la base oficial CIMA.'
          }
          ctaLabel={canMutate && !query ? 'Añadir medicamento' : undefined}
          onCtaClick={
            canMutate && !query
              ? () => navigate(`${ROUTES.blisterMedications(activeBlisterId)}/add`)
              : undefined
          }
        />
      ) : (
        <ul className="c-inventory-page__list">
          {visible.map((m) => (
            <li key={m._id} className="c-inventory-page__item">
              <MedicineCard medicine={m} blisterId={activeBlisterId} />
            </li>
          ))}
        </ul>
      )}

      {canMutate ? (
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate(`${ROUTES.blisterMedications(activeBlisterId)}/add`)}
        >
          Añadir medicamento
        </Button>
      ) : null}
    </section>
  );
}

export default InventoryPage;
