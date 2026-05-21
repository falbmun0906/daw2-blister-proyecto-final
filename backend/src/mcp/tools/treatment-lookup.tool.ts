import { type TreatmentLookupInput } from '../../../../shared/schemas';
import { medicinesList } from '../../modules/medicines/medicines.service';
import { treatmentsList } from '../../modules/treatments/treatments.service';
import { computeNextDose } from '../../utils/dose-schedule';
import {
  type McpBlisterContext,
  type McpTreatmentLookupItem,
  type McpTreatmentLookupMedicine,
  type McpTreatmentLookupTool,
} from '../types';
import { resolveMcpBlisterTargets } from '../blister-resolver';

const normalizeText = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const matchesText = (value: string | undefined, haystack: string): boolean => {
  if (!value) {
    return true;
  }

  return normalizeText(haystack).includes(normalizeText(value));
};

const describeSchedule = (entry: McpTreatmentLookupMedicine): string => {
  if (!entry.isRecurring) {
    return `Dosis unica iniciada en ${entry.nextDoseAt?.toISOString() ?? 'la fecha configurada'}`;
  }

  if (entry.scheduleType === 'daily_times') {
    const hours = entry.dailyDoseTimes.join(', ');
    return hours.length > 0
      ? `Todos los dias a las ${hours}`
      : 'Pauta diaria sin horas exactas configuradas';
  }

  return entry.frequencyHours
    ? `Cada ${entry.frequencyHours} horas desde la primera dosis configurada`
    : 'Pauta por intervalo sin frecuencia disponible';
};

const mapTreatmentItemsForBlister = async (
  blister: McpBlisterContext,
  activeOnly: boolean,
): Promise<McpTreatmentLookupItem[]> => {
  const now = new Date();
  const [treatmentsResult, medicinesResult] = await Promise.all([
    treatmentsList(blister.blisterId, { page: 1, limit: 100 }),
    medicinesList(blister.blisterId, { page: 1, limit: 100 }),
  ]);
  const medicinesById = new Map(
    medicinesResult.medicines.map((medicine) => [medicine.id, medicine]),
  );

  return treatmentsResult.treatments
    .filter((treatment) => !activeOnly || treatment.active)
    .map((treatment) => ({
      blisterId: blister.blisterId,
      blisterName: blister.blisterName,
      role: blister.role,
      treatmentId: treatment.id,
      patientUserId: treatment.patientUserId,
      title: treatment.title,
      description: treatment.description,
      timeZone: treatment.timeZone,
      startDate: treatment.startDate,
      endDate: treatment.endDate,
      active: treatment.active,
      medicines: treatment.medicines.map((entry) => {
        const medicine = medicinesById.get(entry.medicineId);
        const nextDoseAt = computeNextDose({
          startDate: treatment.startDate,
          endDate: treatment.endDate,
          active: treatment.active,
          timeZone: treatment.timeZone,
        }, {
          firstDoseAt: entry.firstDoseAt,
          scheduleType: entry.scheduleType,
          frequencyHours: entry.frequencyHours,
          dailyDoseTimes: entry.dailyDoseTimes,
          isRecurring: entry.isRecurring,
        }, now);
        const mappedEntry: McpTreatmentLookupMedicine = {
          medicineId: entry.medicineId,
          medicineName: medicine?.nombre ?? 'Medicamento',
          medicineAlias: medicine?.alias ?? null,
          amount: entry.amount,
          scheduleType: entry.scheduleType,
          frequencyHours: entry.frequencyHours,
          dailyDoseTimes: entry.dailyDoseTimes,
          isRecurring: entry.isRecurring,
          note: entry.note,
          scheduleSummary: '',
          nextDoseAt,
        };

        mappedEntry.scheduleSummary = describeSchedule(mappedEntry);

        return mappedEntry;
      }),
    }));
};

const matchesTreatmentFilters = (input: TreatmentLookupInput, item: McpTreatmentLookupItem): boolean => {
  if (input.treatmentId && item.treatmentId !== input.treatmentId) {
    return false;
  }

  if (input.medicineId && !item.medicines.some((medicine) => medicine.medicineId === input.medicineId)) {
    return false;
  }

  if (!matchesText(input.treatmentText, `${item.title} ${item.description ?? ''}`)) {
    return false;
  }

  if (input.medicineText) {
    return item.medicines.some((medicine) =>
      matchesText(input.medicineText, `${medicine.medicineName} ${medicine.medicineAlias ?? ''}`));
  }

  return true;
};

export const treatmentLookupTool: McpTreatmentLookupTool = {
  name: 'treatment_lookup',
  description:
    'Busca tratamientos activos o historicos por blister, texto o medicamento, devolviendo treatmentId y las medicinas asociadas con su horario para poder registrar tomas sin adivinar IDs.',
  run: async (context, input) => {
    const targetBlisters = resolveMcpBlisterTargets(context, input);
    const treatments = (await Promise.all(
      targetBlisters.map((blister) => mapTreatmentItemsForBlister(blister, input.activeOnly)),
    ))
      .flat()
      .filter((item) => matchesTreatmentFilters(input, item))
      .sort((left, right) => {
        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }

        return left.title.localeCompare(right.title);
      });
    const offset = (input.page - 1) * input.limit;

    return {
      items: treatments.slice(offset, offset + input.limit),
      meta: {
        page: input.page,
        limit: input.limit,
        total: treatments.length,
        totalPages: treatments.length === 0 ? 0 : Math.ceil(treatments.length / input.limit),
      },
    };
  },
};