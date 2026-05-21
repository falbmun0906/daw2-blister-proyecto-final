import { ADHERENCE_UNDO_WINDOW_MS } from '../../constants/ui.constants';
import type { AdherenceLog } from '../../types/adherence.types';
import type { Medicine } from '../../types/medicine.types';
import { Button } from '../atoms/Button';

interface AdherenceLogItemProps {
  log: AdherenceLog;
  medicines: Medicine[];
  currentUserId: string | null;
  onUndo: (log: AdherenceLog) => void;
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function isWithinUndoWindow(log: AdherenceLog): boolean {
  const elapsed = Date.now() - new Date(log.createdAt).getTime();
  return elapsed >= 0 && elapsed < ADHERENCE_UNDO_WINDOW_MS;
}

function resolveMedicineName(medicines: Medicine[], medicineId: string): string {
  const medicine = medicines.find((m) => m._id === medicineId);
  if (!medicine) return 'Medicamento';
  return medicine.alias?.trim() || medicine.nombre;
}

/** Fila del historial de tomas con metadatos, badge de forzado y undo. */
export function AdherenceLogItem({ log, medicines, currentUserId, onUndo }: AdherenceLogItemProps) {
  const canUndo = isWithinUndoWindow(log) && currentUserId === log.userId;
  const formattedDate = dateFormatter.format(new Date(log.timestamp));
  const medicineName = resolveMedicineName(medicines, log.medicineId);

  return (
    <article className="c-adherence-log-item" aria-label={`Toma de ${medicineName}`}>
      <header className="c-adherence-log-item__header">
        <h3 className="c-adherence-log-item__title">{medicineName}</h3>
        <time className="c-adherence-log-item__date" dateTime={log.timestamp}>
          {formattedDate}
        </time>
      </header>
      <p className="c-adherence-log-item__meta">
        Cantidad: <strong>{log.amount}</strong>
        {log.isForced ? (
          <span className="c-adherence-log-item__badge">Forzada</span>
        ) : null}
      </p>
      {log.isForced && log.notes ? (
        <p className="c-adherence-log-item__notes">{log.notes}</p>
      ) : null}
      {canUndo ? (
        <footer className="c-adherence-log-item__actions">
          <Button variant="ghost" onClick={() => onUndo(log)}>
            Deshacer
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
