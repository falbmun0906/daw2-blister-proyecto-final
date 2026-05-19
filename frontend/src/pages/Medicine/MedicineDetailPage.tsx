import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  TbAlertCircle,
  TbBell,
  TbCalendarTime,
  TbChevronRight,
  TbExternalLink,
  TbPackage,
  TbPencil,
  TbStethoscope,
  TbTrash,
} from 'react-icons/tb';

import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ActionMenuButton } from '../../components/molecules/ActionMenuButton';
import { MedicineIcon } from '../../components/molecules/MedicineIcon';
import { StockBadge } from '../../components/molecules/StockBadge';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { getMedicineAlerts } from '../../lib/medicine-alerts';
import { getCimaDetail } from '../../services/external.service';
import { getMedicine, removeMedicine } from '../../services/medicines.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { ExternalMedicineInfo, Medicine } from '../../types/medicine.types';
import type { TreatmentMedicineEntry } from '../../types/treatment.types';

interface DetailState {
  medicine: Medicine | null;
  cima: ExternalMedicineInfo | null;
  error: string | null;
  isLoading: boolean;
}

interface MedicineTreatmentUsage {
  id: string;
  title: string;
  active: boolean;
  entry: TreatmentMedicineEntry;
}

const quantityFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('es-ES');
}

function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

function formatTreatmentSchedule(entry: TreatmentMedicineEntry): string {
  const amount = `${formatQuantity(entry.amount)} por toma`;

  if (!entry.isRecurring) {
    return `${amount}, toma unica`;
  }

  if (entry.scheduleType === 'daily_times' && entry.dailyDoseTimes.length > 0) {
    return `${amount}, a las ${entry.dailyDoseTimes.join(', ')}`;
  }

  return entry.frequencyHours
    ? `${amount}, cada ${entry.frequencyHours} h`
    : `${amount}, pauta recurrente`;
}

function MedicineDetailPage() {
  usePageTitle('Medicamento');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId, medicineId } = useParams<{
    blisterId: string;
    medicineId: string;
  }>();
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const activeRole = useBlisterStore((state) => state.activeRole);
  const blisters = useBlisterStore((state) => state.blisters);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const removeFromStore = useMedicinesStore((state) => state.removeMedicine);
  const addToast = useUiStore((state) => state.addToast);
  const blisterId = routeBlisterId ?? activeBlisterId;
  const { treatments, isLoading: treatmentsLoading } = useTreatments(blisterId);
  const [state, setState] = useState<DetailState>({
    medicine: null,
    cima: null,
    error: null,
    isLoading: true,
  });
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const routeRole = blisters
    .find((blister) => blister._id === blisterId)
    ?.members.find((member) => member.userId === userId)
    ?.role ?? null;
  const role = routeRole ?? activeRole;
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';
  const { medicine, cima, error, isLoading } = state;
  const medicineImage = cima?.fotos.find((foto) => foto.url)?.url ?? null;
  const medicineAlerts = medicine ? getMedicineAlerts(medicine, cima) : [];
  const medicineTreatmentUsage = useMemo<MedicineTreatmentUsage[]>(() => {
    if (!medicine) return [];

    return treatments.flatMap<MedicineTreatmentUsage>((treatment) => {
      const entry = treatment.medicines.find((item) => item.medicineId === medicine._id);
      if (!entry) return [];
      return {
        id: treatment.id,
        title: treatment.title,
        active: treatment.active,
        entry,
      } satisfies MedicineTreatmentUsage;
    });
  }, [medicine, treatments]);

  useEffect(() => {
    if (!blisterId || !medicineId) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      getMedicine(blisterId, medicineId)
        .then(async (loadedMedicine) => {
          if (!loadedMedicine) {
            if (!cancelled) {
              setState({
                medicine: null,
                cima: null,
                error: 'Medicamento no encontrado.',
                isLoading: false,
              });
            }
            return;
          }

          const cimaInfo = await getCimaDetail(loadedMedicine.nregist).catch(() => null);

          if (!cancelled) {
            setState({
              medicine: loadedMedicine,
              cima: cimaInfo,
              error: null,
              isLoading: false,
            });
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setState({
            medicine: null,
            cima: null,
            error: isApiError(err) ? err.message : 'No se ha podido cargar el medicamento.',
            isLoading: false,
          });
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [blisterId, medicineId]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  if (!blisterId) return <Navigate to={ROUTES.blisters} replace />;
  if (!medicineId) return <Navigate to={ROUTES.blisterMedications(blisterId)} replace />;

  const handleDelete = async () => {
    if (!medicine) return;
    setDeleting(true);
    try {
      await removeMedicine(blisterId, medicine._id);
      removeFromStore(medicine._id);
      addToast({ message: 'Medicamento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterMedications(blisterId));
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
          <Skeleton height="5rem" />
          <Skeleton height="4rem" />
          <Skeleton height="8rem" />
        </div>
      ) : error || !medicine ? (
        <ErrorState message={error ?? 'No se ha encontrado el medicamento.'} />
      ) : (
        <>
          <header className="c-medicine-detail-page__hero">
            <figure className="c-medicine-detail-page__icon" aria-hidden="true">
              {medicineImage ? (
                <img src={medicineImage} alt="" loading="lazy" />
              ) : (
                <MedicineIcon type={medicine.iconType} size="lg" />
              )}
            </figure>

            <div className="c-medicine-detail-page__hero-body">
              <h1 id="medicine-detail-title" className="c-medicine-detail-page__name">
                {medicine.alias?.trim() || medicine.nombre}
              </h1>
              {medicine.alias?.trim() ? (
                <p className="c-medicine-detail-page__official">{medicine.nombre}</p>
              ) : null}
            </div>

            <div className="c-action-menu c-medicine-detail-page__menu" ref={menuRef}>
              <ActionMenuButton
                className="c-medicine-detail-page__menu-toggle"
                label="Acciones del medicamento"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              />
              {menuOpen ? (
                <div className="c-action-menu__popover c-medicine-detail-page__menu-popover" role="menu">
                  <button
                    type="button"
                    className="c-action-menu__item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(ROUTES.cimaMedicineDetail(medicine.nregist));
                    }}
                  >
                    <TbExternalLink aria-hidden="true" />
                    <span>Ficha CIMA</span>
                  </button>
                  {canMutate ? (
                    <Link
                      className="c-action-menu__item"
                      to={ROUTES.editMedicine(blisterId, medicine._id)}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <TbPencil aria-hidden="true" />
                      <span>Editar</span>
                    </Link>
                  ) : null}
                  {canMutate ? (
                    <button
                      type="button"
                      className="c-action-menu__item c-action-menu__item--danger"
                      role="menuitem"
                      disabled={deleting}
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      <TbTrash aria-hidden="true" />
                      <span>{deleting ? 'Eliminando...' : 'Eliminar'}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          <section className="c-medicine-detail-page__section" aria-labelledby="medicine-stock-title">
            <h2 id="medicine-stock-title" className="c-medicine-detail-page__section-title">
              <TbPackage aria-hidden="true" />
              Caja en botiquín
            </h2>
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
                <dt>Umbral de aviso</dt>
                <dd>{formatQuantity(medicine.threshold)} {medicine.stockUnit}</dd>
              </div>
              <div className="c-medicine-detail-page__fact">
                <dt>Caducidad</dt>
                <dd>{formatDate(medicine.expDate)}</dd>
              </div>
              <div className="c-medicine-detail-page__fact">
                <dt>Nº registro</dt>
                <dd>{medicine.nregist}</dd>
              </div>
            </dl>
          </section>

          <section className="c-medicine-detail-page__section" aria-labelledby="medicine-alerts-title">
            <h2 id="medicine-alerts-title" className="c-medicine-detail-page__section-title">
              <TbBell aria-hidden="true" />
              Alertas vigentes ({medicineAlerts.length})
            </h2>
            {medicineAlerts.length > 0 ? (
              <ul className="c-medicine-detail-page__alert-list">
                {medicineAlerts.map((alert) => (
                  <li key={`${alert.kind}-${alert.label}`} className="c-medicine-detail-page__alert">
                    <TbAlertCircle aria-hidden="true" />
                    <span>
                      {alert.label}
                      {alert.detail ? <small>{alert.detail}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="c-medicine-detail-page__empty-note">Sin alertas vigentes.</p>
            )}
          </section>

          <section className="c-medicine-detail-page__section" aria-labelledby="medicine-treatments-title">
            <h2 id="medicine-treatments-title" className="c-medicine-detail-page__section-title">
              <TbStethoscope aria-hidden="true" />
              Tratamientos
            </h2>
            {treatmentsLoading ? (
              <Skeleton height="3rem" />
            ) : medicineTreatmentUsage.length > 0 ? (
              <ul className="c-medicine-detail-page__treatment-list">
                {medicineTreatmentUsage.map((usage) => (
                  <li key={usage.id} className="c-medicine-detail-page__treatment-item">
                    <Link
                      to={ROUTES.treatmentDetail(blisterId, usage.id)}
                      className="c-medicine-detail-page__treatment-link"
                    >
                      <span className="c-medicine-detail-page__treatment-icon" aria-hidden="true">
                        <TbCalendarTime />
                      </span>
                      <span className="c-medicine-detail-page__treatment-body">
                        <span className="c-medicine-detail-page__treatment-name">{usage.title}</span>
                        <span className="c-medicine-detail-page__treatment-meta">
                          {usage.active ? 'Activo' : 'Archivado'} · {formatTreatmentSchedule(usage.entry)}
                        </span>
                      </span>
                      <TbChevronRight className="c-medicine-detail-page__treatment-chevron" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="c-medicine-detail-page__empty-note">
                Esta caja no está asignada a ningún tratamiento.
              </p>
            )}
          </section>

          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Eliminar medicamento"
            message="¿Eliminar este medicamento del botiquín? Se ocultará del inventario y se conservará el histórico. Si está en un tratamiento activo, primero tendrás que editar o finalizar esa pauta."
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={handleDelete}
            ariaLabel="Confirmar eliminación del medicamento"
          />
        </>
      )}
    </section>
  );
}

export default MedicineDetailPage;
