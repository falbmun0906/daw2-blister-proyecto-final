import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { TbExternalLink, TbPencil, TbTrash } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { MedicineIcon } from '../../components/molecules/MedicineIcon';
import { StockBadge } from '../../components/molecules/StockBadge';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { getCimaDetail } from '../../services/external.service';
import { getMedicine, removeMedicine } from '../../services/medicines.service';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { ExternalMedicineInfo, Medicine } from '../../types/medicine.types';
import './MedicineDetailPage.scss';

interface DetailState {
  medicine: Medicine | null;
  cima: ExternalMedicineInfo | null;
  error: string | null;
  isLoading: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES');
}

function MedicineDetailPage() {
  usePageTitle('Medicamento');
  const navigate = useNavigate();
  const { medicineId } = useParams<{ blisterId: string; medicineId: string }>();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const removeFromStore = useMedicinesStore((s) => s.removeMedicine);
  const addToast = useUiStore((s) => s.addToast);
  const [deleting, setDeleting] = useState(false);

  const [state, setState] = useState<DetailState>({
    medicine: null, cima: null, error: null, isLoading: true,
  });

  useEffect(() => {
    if (!activeBlisterId || !medicineId) return;
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const med = await getMedicine(activeBlisterId, medicineId);
        if (!med) {
          if (!cancelled) setState({ medicine: null, cima: null, error: 'Medicamento no encontrado.', isLoading: false });
          return;
        }
        let cima: ExternalMedicineInfo | null = null;
        try {
          cima = await getCimaDetail(med.nregist);
        } catch {
          // CIMA puede fallar puntualmente; mostramos la info local sin bloquear.
          cima = null;
        }
        if (!cancelled) setState({ medicine: med, cima, error: null, isLoading: false });
      } catch (err) {
        if (cancelled) return;
        setState({
          medicine: null, cima: null,
          error: isApiError(err) ? err.message : 'No se ha podido cargar el medicamento.',
          isLoading: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [activeBlisterId, medicineId]);

  if (!activeBlisterId) return <Navigate to={ROUTES.blisters} replace />;
  if (!medicineId) return <Navigate to={ROUTES.blisterMedications(activeBlisterId)} replace />;

  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';
  const { medicine, cima, error, isLoading } = state;

  const handleDelete = async () => {
    if (!medicine || !activeBlisterId) return;
    if (!confirm('¿Eliminar este medicamento del botiquín?')) return;
    setDeleting(true);
    try {
      await removeMedicine(activeBlisterId, medicine._id);
      removeFromStore(medicine._id);
      addToast({ message: 'Medicamento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterMedications(activeBlisterId));
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar.',
        variant: 'error',
      });
      setDeleting(false);
    }
  };

  return (
    <section className="c-medicine-detail-page" aria-labelledby="medicine-detail-title">

      {isLoading ? (
        <div aria-busy="true" className="c-medicine-detail-page__skeleton">
          <Skeleton height="6rem" />
          <Skeleton height="3rem" />
          <Skeleton height="8rem" />
        </div>
      ) : error || !medicine ? (
        <ErrorState message={error ?? 'No se ha encontrado el medicamento.'} />
      ) : (
        <>
          <div className="c-medicine-detail-page__hero">
            <span className="c-medicine-detail-page__icon">
              <MedicineIcon type={medicine.iconType} size="lg" />
            </span>
            <div className="c-medicine-detail-page__hero-body">
              <h2 className="c-medicine-detail-page__name">{medicine.alias?.trim() || medicine.nombre}</h2>
              {medicine.alias?.trim() ? (
                <p className="c-medicine-detail-page__official">{medicine.nombre}</p>
              ) : null}
              <p className="c-medicine-detail-page__dose">{medicine.dosisOficial} · {medicine.formaOficial}</p>
            </div>
          </div>

          <dl className="c-medicine-detail-page__facts">
            <div className="c-medicine-detail-page__fact">
              <dt>Stock</dt>
              <dd>
                <StockBadge
                  stock={medicine.stock}
                  threshold={medicine.threshold}
                  unit={medicine.stockUnit}
                />
              </dd>
            </div>
            <div className="c-medicine-detail-page__fact">
              <dt>Caducidad</dt>
              <dd>{formatDate(medicine.expDate)}</dd>
            </div>
            <div className="c-medicine-detail-page__fact">
              <dt>Principio activo</dt>
              <dd>{medicine.pactivos}</dd>
            </div>
            <div className="c-medicine-detail-page__fact">
              <dt>Nº registro</dt>
              <dd>{medicine.nregist}</dd>
            </div>
          </dl>

          {cima ? (
            <section className="c-medicine-detail-page__cima" aria-label="Información oficial CIMA">
              <h3 className="c-medicine-detail-page__cima-title">Información oficial (AEMPS)</h3>
              {cima.labtitular ? (
                <p><strong>Laboratorio:</strong> {cima.labtitular}</p>
              ) : null}
              {!cima.comerc ? (
                <p className="c-medicine-detail-page__cima-warn">No comercializado actualmente.</p>
              ) : null}
              {cima.psum ? (
                <p className="c-medicine-detail-page__cima-warn">Problemas de suministro.</p>
              ) : null}
              {cima.cimaStatus.hasAlerts ? (
                <p className="c-medicine-detail-page__cima-warn">Existen alertas oficiales.</p>
              ) : null}
            </section>
          ) : null}

          {canMutate ? (
            <div className="c-medicine-detail-page__actions">
              <Button
                type="button"
                variant="primary-outline"
                onClick={() => navigate(ROUTES.cimaMedicineDetail(medicine.nregist))}
              >
                <TbExternalLink aria-hidden="true" /> Prospecto
              </Button>
              <Link
                to={`${ROUTES.medicineDetail(activeBlisterId, medicine._id)}/edit`}
                className="c-btn c-btn--primary"
              >
                <TbPencil aria-hidden="true" /> Editar
              </Link>
              <Button
                type="button"
                variant="danger"
                loading={deleting}
                onClick={() => void handleDelete()}
              >
                <TbTrash aria-hidden="true" /> Eliminar
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default MedicineDetailPage;
