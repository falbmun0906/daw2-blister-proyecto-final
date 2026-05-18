import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  TbBuildingHospital,
  TbCalendar,
  TbInfoCircle,
  TbMapPin,
  TbPencil,
  TbPill,
  TbTrash,
  TbUser,
} from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ActionMenuButton } from '../../components/molecules/ActionMenuButton';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ForceDoseDialog } from '../../components/molecules/ForceDoseDialog';
import { UndoToast } from '../../components/molecules/UndoToast';
import { ROUTES } from '../../constants/routes';
import { useAdherence, isStockInsufficientError } from '../../hooks/use.adherence';
import { useAppointments } from '../../hooks/use.appointments';
import { useBlisters } from '../../hooks/use.blisters';
import { useMedicines } from '../../hooks/use.medicines';
import { usePageTitle } from '../../hooks/use.page-title';
import { useTreatments } from '../../hooks/use.treatments';
import { getCimaDetail } from '../../services/external.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { Appointment } from '../../types/appointment.types';
import type { ExternalMedicineInfo, Medicine } from '../../types/medicine.types';
import type { Treatment } from '../../types/treatment.types';

type TreatmentMedicineEntry = Treatment['medicines'][number];
type CimaPhoto = ExternalMedicineInfo['fotos'][number];

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const quantityFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function getMedicineName(medicine: Medicine | null): string {
  if (!medicine) return 'Medicamento';
  return medicine.alias?.trim() || medicine.nombre;
}

function formatQuantity(amount: number): string {
  return `${quantityFormatter.format(amount)} ${amount === 1 ? 'unidad' : 'unidades'}`;
}

function formatMedicineSchedule(entry: TreatmentMedicineEntry): string {
  const firstDoseTime = timeFormatter.format(new Date(entry.firstDoseAt));

  if (!entry.isRecurring) {
    return `toma única a las ${firstDoseTime}`;
  }

  if (entry.scheduleType === 'daily_times' && entry.dailyDoseTimes.length > 0) {
    return `a las ${entry.dailyDoseTimes.join(', ')} cada día`;
  }

  return `cada ${entry.frequencyHours ?? 0} h desde las ${firstDoseTime}`;
}

function getProgress(treatment: Treatment): { percent: number; label: string; range: string } {
  const start = new Date(treatment.startDate).getTime();
  const end = treatment.endDate ? new Date(treatment.endDate).getTime() : start;
  const now = Date.now();
  const range = treatment.endDate
    ? `${dateFormatter.format(new Date(treatment.startDate))} - ${dateFormatter.format(new Date(treatment.endDate))}`
    : `Desde ${dateFormatter.format(new Date(treatment.startDate))}`;

  if (!treatment.endDate || end <= start) {
    return { percent: treatment.active ? 100 : 0, label: treatment.active ? 'En curso' : 'Archivado', range };
  }

  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const currentDay = Math.min(totalDays, Math.max(1, Math.ceil((now - start) / 86_400_000)));
  const percent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  return { percent, label: `Día ${currentDay} de ${totalDays}`, range };
}

interface TreatmentMedicineCardProps {
  treatment: Treatment;
  medicine: Medicine | null;
  entry: Treatment['medicines'][number];
  blisterId: string;
  imageUrl?: string | null;
  canMutate: boolean;
  note: string;
  isSaving: boolean;
  onNoteChange: (medicineId: string, note: string) => void;
  onNoteBlur: (medicineId: string) => void;
  onLogDose: (entry: Treatment['medicines'][number]) => void;
}

function TreatmentMedicineCard({
  treatment,
  medicine,
  entry,
  blisterId,
  imageUrl,
  canMutate,
  note,
  isSaving,
  onNoteChange,
  onNoteBlur,
  onLogDose,
}: TreatmentMedicineCardProps) {
  const name = getMedicineName(medicine);

  return (
    <article className="c-treatment-detail__medicine-card">
      <header className="c-treatment-detail__medicine-header">
        <div className="c-treatment-detail__medicine-media" aria-hidden="true">
          {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <TbPill />}
        </div>
        <div className="c-treatment-detail__medicine-summary">
          <h3 className="c-treatment-detail__medicine-name">{name}</h3>
          <span className="c-treatment-detail__medicine-dose">
            {formatQuantity(entry.amount)} · {formatMedicineSchedule(entry)}
          </span>
        </div>
      </header>

      <label className="c-treatment-detail__note-field">
        <span>Nota</span>
        <textarea
          value={note}
          rows={3}
          maxLength={300}
          readOnly={!canMutate || isSaving}
          placeholder="Sin nota"
          onChange={(event) => onNoteChange(entry.medicineId, event.target.value)}
          onBlur={() => onNoteBlur(entry.medicineId)}
        />
      </label>

      <div className="c-treatment-detail__medicine-actions">
        {canMutate ? (
          <Button
            type="button"
            variant="primary"
            className="c-btn--card"
            disabled={isSaving}
            onClick={() => onLogDose(entry)}
          >
            {isSaving ? 'Registrando' : 'Registrar toma'}
          </Button>
        ) : null}
        <Link
          to={medicine ? ROUTES.medicineDetail(blisterId, medicine._id) : ROUTES.blisterTreatments(blisterId)}
          className="c-btn c-btn--primary-outline c-btn--card c-treatment-detail__more-link"
          state={{ parentRoute: ROUTES.treatmentDetail(blisterId, treatment.id) }}
        >
          <TbInfoCircle aria-hidden="true" /> Más información
        </Link>
      </div>
    </article>
  );
}

interface PendingDose {
  treatmentId: string;
  medicineId: string;
  amount: number;
}

interface ActiveUndo {
  logId: string;
  createdAt: number;
  message: string;
}

function AppointmentCard({ appointment, isPast }: { appointment: Appointment; isPast: boolean }) {
  const appointmentDateLabel = dateTimeFormatter.format(new Date(appointment.date));

  return (
    <article className={`c-treatment-detail__appointment${isPast ? ' c-treatment-detail__appointment--past' : ''}`}>
      <span className="c-treatment-detail__appointment-icon" aria-hidden="true">
        <TbBuildingHospital />
      </span>
      <div className="c-treatment-detail__appointment-body">
        <h3 className="c-treatment-detail__appointment-title">{appointment.title}</h3>
        <p className="c-treatment-detail__appointment-meta">
          <TbCalendar aria-hidden="true" /> {appointmentDateLabel}
        </p>
        <p className="c-treatment-detail__appointment-meta">
          <TbMapPin aria-hidden="true" /> {appointment.location?.trim() || 'Lugar pendiente'}
        </p>
      </div>
    </article>
  );
}

function splitAppointmentsByCurrentTime(appointments: Appointment[]): {
  upcoming: Appointment[];
  past: Appointment[];
} {
  const now = Date.now();
  return {
    upcoming: appointments.filter((appointment) => new Date(appointment.date).getTime() >= now),
    past: appointments.filter((appointment) => new Date(appointment.date).getTime() < now),
  };
}

function TreatmentDetailPage() {
  usePageTitle('Tratamiento');
  const navigate = useNavigate();
  const { blisterId: routeBlisterId, treatmentId } = useParams<{ blisterId: string; treatmentId: string }>();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const addToast = useUiStore((s) => s.addToast);
  const blisterId = routeBlisterId ?? activeBlisterId;

  const { hasLoaded: blistersLoaded } = useBlisters(blisterId);
  const { treatments, isLoading, error, refetch, updateTreatment, removeTreatment } = useTreatments(blisterId);
  const { medicines, isLoading: medicinesLoading } = useMedicines(blisterId);
  const { appointments, isLoading: appointmentsLoading } = useAppointments(blisterId);
  const { logDose, undoLog } = useAdherence(blisterId);
  const [medicineImages, setMedicineImages] = useState<Record<string, string | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [loggingMedicineId, setLoggingMedicineId] = useState<string | null>(null);
  const [pendingDose, setPendingDose] = useState<PendingDose | null>(null);
  const [activeUndos, setActiveUndos] = useState<ActiveUndo[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const treatment = useMemo(
    () => (treatmentId ? treatments.find((item) => item.id === treatmentId) ?? null : null),
    [treatmentId, treatments],
  );
  const currentBlister = useMemo(
    () => blisters.find((blister) => blister._id === blisterId) ?? null,
    [blisterId, blisters],
  );
  const patient = useMemo(
    () => currentBlister?.members.find((member) => member.userId === treatment?.patientUserId) ?? null,
    [currentBlister, treatment?.patientUserId],
  );
  const role = useMemo(
    () => currentBlister?.members.find((member) => member.userId === userId)?.role
      ?? (blisterId === activeBlisterId ? activeRole : null),
    [activeBlisterId, activeRole, blisterId, currentBlister, userId],
  );
  const canMutate = role === 'OWNER' || role === 'CAREGIVER';
  const medicineById = useMemo(
    () => new Map(medicines.map((medicine) => [medicine._id, medicine])),
    [medicines],
  );
  const treatmentAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.treatmentId === treatment?.id),
    [appointments, treatment?.id],
  );
  const appointmentGroups = useMemo(
    () => splitAppointmentsByCurrentTime(treatmentAppointments),
    [treatmentAppointments],
  );
  const upcomingAppointments = appointmentGroups.upcoming;
  const pastAppointments = appointmentGroups.past;
  const progress = treatment ? getProgress(treatment) : null;

  const getMedicineLabel = useCallback(
    (medicineId: string): string => getMedicineName(medicineById.get(medicineId) ?? null),
    [medicineById],
  );

  useEffect(() => {
    if (!treatment) return;
    const timeoutId = window.setTimeout(() => {
      setNotes(Object.fromEntries(treatment.medicines.map((entry: TreatmentMedicineEntry) => [entry.medicineId, entry.note ?? ''])));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [treatment]);

  useEffect(() => {
    if (!treatment) return;
    let cancelled = false;
    const loadImages = async () => {
      const entries = await Promise.all(
        treatment.medicines.map(async (entry: TreatmentMedicineEntry) => {
          const medicine = medicineById.get(entry.medicineId);
          if (!medicine?.nregist) return [entry.medicineId, null] as const;
          try {
            const info = await getCimaDetail(medicine.nregist);
            return [entry.medicineId, info.fotos.find((foto: CimaPhoto) => foto.url)?.url ?? null] as const;
          } catch {
            return [entry.medicineId, null] as const;
          }
        }),
      );
      if (!cancelled) setMedicineImages(Object.fromEntries(entries));
    };
    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [medicineById, treatment]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleNoteChange = useCallback((medicineId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [medicineId]: note }));
  }, []);

  const handleNoteBlur = useCallback(
    async (medicineId: string) => {
      if (!treatment || !canMutate) return;
      const nextNote = notes[medicineId] ?? '';
      const entry = treatment.medicines.find((item: TreatmentMedicineEntry) => item.medicineId === medicineId);
      if (!entry || (entry.note ?? '') === nextNote) return;

      setSavingNoteId(medicineId);
      try {
        await updateTreatment(treatment.id, {
          medicines: treatment.medicines.map((item: TreatmentMedicineEntry) => ({
            medicineId: item.medicineId,
            amount: item.amount,
            firstDoseAt: new Date(item.firstDoseAt),
            scheduleType: item.scheduleType,
            frequencyHours: item.frequencyHours,
            dailyDoseTimes: item.dailyDoseTimes,
            isRecurring: item.isRecurring,
            note: item.medicineId === medicineId ? nextNote || undefined : item.note ?? undefined,
          })),
        });
        addToast({ message: 'Nota actualizada.', variant: 'success' });
      } catch (err) {
        addToast({
          message: isApiError(err) ? err.message : 'No se ha podido guardar la nota.',
          variant: 'error',
        });
      } finally {
        setSavingNoteId(null);
      }
    },
    [addToast, canMutate, notes, treatment, updateTreatment],
  );

  const pushUndoToast = useCallback(
    (logId: string, medicineId: string) => {
      setActiveUndos((prev) => [
        ...prev,
        {
          logId,
          createdAt: Date.now(),
          message: `Toma registrada: ${getMedicineLabel(medicineId)}.`,
        },
      ]);
    },
    [getMedicineLabel],
  );

  const dismissUndoToast = useCallback((logId: string) => {
    setActiveUndos((prev) => prev.filter((undo) => undo.logId !== logId));
  }, []);

  const handleLogDose = useCallback(
    async (entry: Treatment['medicines'][number]) => {
      if (!treatment) return;
      setLoggingMedicineId(entry.medicineId);
      try {
        const log = await logDose({
          treatmentId: treatment.id,
          medicineId: entry.medicineId,
          amount: entry.amount,
        });
        pushUndoToast(log.id, entry.medicineId);
      } catch (err) {
        if (isStockInsufficientError(err)) {
          setPendingDose({
            treatmentId: treatment.id,
            medicineId: entry.medicineId,
            amount: entry.amount,
          });
          return;
        }
        addToast({
          message: isApiError(err) ? err.message : 'No se ha podido registrar la toma.',
          variant: 'error',
        });
      } finally {
        setLoggingMedicineId(null);
      }
    },
    [addToast, logDose, pushUndoToast, treatment],
  );

  const handleForceConfirm = useCallback(
    async (notes: string) => {
      if (!pendingDose) return;
      const dose = pendingDose;
      setPendingDose(null);
      setLoggingMedicineId(dose.medicineId);
      try {
        const log = await logDose({
          treatmentId: dose.treatmentId,
          medicineId: dose.medicineId,
          amount: dose.amount,
          force: true,
          notes,
        });
        pushUndoToast(log.id, dose.medicineId);
      } catch (err) {
        addToast({
          message: isApiError(err) ? err.message : 'No se ha podido registrar la toma forzada.',
          variant: 'error',
        });
      } finally {
        setLoggingMedicineId(null);
      }
    },
    [addToast, logDose, pendingDose, pushUndoToast],
  );

  const handleUndo = useCallback(
    async (logId: string) => {
      dismissUndoToast(logId);
      try {
        await undoLog(logId);
        addToast({ message: 'Toma deshecha.', variant: 'success' });
      } catch (err) {
        addToast({
          message: isApiError(err) ? err.message : 'No se ha podido deshacer la toma.',
          variant: 'error',
        });
      }
    },
    [addToast, dismissUndoToast, undoLog],
  );

  const handleDeleteTreatment = useCallback(async () => {
    if (!treatment || !blisterId) return;
    try {
      await removeTreatment(treatment.id);
      addToast({ message: 'Tratamiento eliminado.', variant: 'success' });
      navigate(ROUTES.blisterTreatments(blisterId));
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar el tratamiento.',
        variant: 'error',
      });
    }
  }, [addToast, blisterId, navigate, removeTreatment, treatment]);

  if (!blisterId) return <Navigate to={ROUTES.blisters} replace />;
  if (!treatmentId) return <Navigate to={ROUTES.blisterTreatments(blisterId)} replace />;

  if ((!blistersLoaded && blisters.length === 0) || isLoading) {
    return (
      <section className="c-treatment-detail" aria-busy="true">
        <Skeleton height="8rem" />
        <Skeleton height="7rem" />
        <Skeleton height="7rem" />
      </section>
    );
  }

  if (!treatment) {
    return (
      <section className="c-treatment-detail">
        <ErrorState message={error ?? 'Tratamiento no encontrado.'} onRetry={() => void refetch()} />
      </section>
    );
  }

  const patientName = patient?.fullName?.trim() || patient?.username?.trim() || 'Paciente';

  return (
    <section className="c-treatment-detail" aria-labelledby="treatment-detail-title">
      <header className="c-treatment-detail__hero">
        <Avatar name={patientName} avatarKey={patient?.avatarKey ?? undefined} size="md" />
        <div className="c-treatment-detail__hero-body">
          <h2 id="treatment-detail-title" className="c-treatment-detail__title">{treatment.title}</h2>
          <p className="c-treatment-detail__meta">
            <TbUser aria-hidden="true" /> {patientName}
          </p>
          <p className="c-treatment-detail__meta">
            <TbBuildingHospital aria-hidden="true" /> {currentBlister?.name ?? 'Blíster'}
          </p>
        </div>
        {canMutate ? (
          <div className="c-action-menu c-treatment-detail__menu" ref={menuRef}>
            <ActionMenuButton
              className="c-treatment-detail__menu-toggle"
              label="Acciones del tratamiento"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            />
            {menuOpen ? (
              <div className="c-action-menu__popover c-treatment-detail__menu-popover" role="menu">
                <Link
                  className="c-action-menu__item"
                  to={ROUTES.editTreatment(blisterId, treatment.id)}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <TbPencil aria-hidden="true" />
                  <span>Editar</span>
                </Link>
                <button
                  type="button"
                  className="c-action-menu__item c-action-menu__item--danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDeleteOpen(true);
                  }}
                >
                  <TbTrash aria-hidden="true" />
                  <span>Eliminar</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {progress ? (
        <section className="c-treatment-detail__progress-section" aria-label={`Progreso del tratamiento: ${progress.label}`}>
          <div className="c-treatment-detail__progress">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="c-treatment-detail__range">
            <span>{progress.range}</span>
            <span>{progress.label}</span>
          </p>
        </section>
      ) : null}

      {treatment.description ? (
        <section className="c-treatment-detail__section" aria-labelledby="treatment-description-title">
          <h2 id="treatment-description-title" className="c-treatment-detail__section-title">Descripción</h2>
          <p className="c-treatment-detail__description">{treatment.description}</p>
        </section>
      ) : null}

      <section className="c-treatment-detail__section" aria-labelledby="treatment-medicines-title">
        <h2 id="treatment-medicines-title" className="c-treatment-detail__section-title">Medicamentos</h2>
        {medicinesLoading ? (
          <Skeleton height="7rem" />
        ) : (
          <div className="c-treatment-detail__medicine-list">
            {treatment.medicines.map((entry: TreatmentMedicineEntry) => (
              <TreatmentMedicineCard
                key={entry.medicineId}
                treatment={treatment}
                entry={entry}
                blisterId={blisterId}
                medicine={medicineById.get(entry.medicineId) ?? null}
                imageUrl={medicineImages[entry.medicineId]}
                canMutate={canMutate}
                note={notes[entry.medicineId] ?? ''}
                isSaving={savingNoteId === entry.medicineId || loggingMedicineId === entry.medicineId}
                onNoteChange={handleNoteChange}
                onNoteBlur={handleNoteBlur}
                onLogDose={handleLogDose}
              />
            ))}
          </div>
        )}
      </section>

      <section className="c-treatment-detail__section" aria-labelledby="treatment-appointments-title">
        <div className="c-treatment-detail__section-header">
          <h2 id="treatment-appointments-title" className="c-treatment-detail__section-title">Citas médicas</h2>
          {canMutate ? (
            <Button type="button" variant="primary-outline" onClick={() => navigate(ROUTES.newAppointment(blisterId))}>
              Nueva cita
            </Button>
          ) : null}
        </div>
        {appointmentsLoading ? (
          <Skeleton height="5rem" />
        ) : treatmentAppointments.length === 0 ? (
          <EmptyState title="Sin citas vinculadas" description="" />
        ) : (
          <div className="c-treatment-detail__appointment-list">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} isPast={false} />
            ))}
            {pastAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} isPast />
            ))}
          </div>
        )}
      </section>

      <ForceDoseDialog
        isOpen={pendingDose !== null}
        onConfirm={(notes) => void handleForceConfirm(notes)}
        onCancel={() => setPendingDose(null)}
      />

      {activeUndos.length > 0 ? (
        <div className="c-treatment-detail__undo-stack" aria-live="polite">
          {activeUndos.map((undo) => (
            <UndoToast
              key={undo.logId}
              logId={undo.logId}
              message={undo.message}
              createdAt={undo.createdAt}
              onUndo={(id) => void handleUndo(id)}
              onExpire={dismissUndoToast}
            />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteOpen}
        message={`¿Eliminar el tratamiento "${treatment.title}"?`}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteTreatment}
        ariaLabel="Confirmar eliminación del tratamiento"
      />
    </section>
  );
}

export default TreatmentDetailPage;
