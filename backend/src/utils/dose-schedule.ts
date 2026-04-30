/**
 * Utilidades de cálculo de próximas tomas a partir de la pauta de un tratamiento.
 *
 * Modelo actual (MVP): pauta por intervalo fijo `frequencyHours` con anclaje en
 * `startDate`. Si en un futuro se introduce una unión discriminada `schedule`
 * (TIMES_PER_DAY, WEEKDAYS, PRN, …) este es el único punto que debe extenderse
 * para que MCP, calendario y home se mantengan consistentes.
 */
const HOUR_IN_MS = 60 * 60 * 1000;

export interface DoseScheduleSource {
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
}

/**
 * Calcula la próxima dosis de una pauta `cada X horas` posterior o igual a
 * `lowerBound`. Si la pauta aún no ha empezado, devuelve la primera toma.
 */
export const computeNextDose = (
  startDate: Date,
  frequencyHours: number,
  lowerBound: Date,
): Date => {
  const frequencyMs = frequencyHours * HOUR_IN_MS;
  const startMs = startDate.getTime();
  const lowerMs = lowerBound.getTime();

  if (startMs >= lowerMs) {
    return new Date(startMs);
  }

  const steps = Math.ceil((lowerMs - startMs) / frequencyMs);
  return new Date(startMs + steps * frequencyMs);
};

/**
 * Genera todas las dosis previstas de una pauta dentro del rango [from, to].
 * Tiene un tope `maxOccurrences` por seguridad para evitar bucles infinitos
 * con frecuencias extremadamente pequeñas.
 */
export const computeDosesInRange = (
  source: DoseScheduleSource,
  frequencyHours: number,
  from: Date,
  to: Date,
  maxOccurrences = 200,
): Date[] => {
  if (!source.active || frequencyHours <= 0 || from > to) {
    return [];
  }

  const cutoff = source.endDate ? Math.min(source.endDate.getTime(), to.getTime()) : to.getTime();
  if (cutoff < from.getTime()) {
    return [];
  }

  const frequencyMs = frequencyHours * HOUR_IN_MS;
  const occurrences: Date[] = [];
  let cursor = computeNextDose(source.startDate, frequencyHours, from);

  while (cursor.getTime() <= cutoff && occurrences.length < maxOccurrences) {
    occurrences.push(new Date(cursor.getTime()));
    cursor = new Date(cursor.getTime() + frequencyMs);
  }

  return occurrences;
};
