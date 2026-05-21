import { treatmentsList } from '../../modules/treatments/treatments.service';
import { medicinesList } from '../../modules/medicines/medicines.service';
import { computeNextDose } from '../../utils/dose-schedule';
import { type McpScheduleAssistantTool } from '../types';
import { resolveMcpBlisterTargets } from '../blister-resolver';

export const scheduleAssistantTool: McpScheduleAssistantTool = {
  name: 'schedule_assistant',
  description:
    'Calcula proximas dosis por tratamiento activo, con posibilidad de filtrar por blisterId o blisterName y rango temporal.',
  run: async (context, input) => {
    const now = new Date();
    const from = input.from ?? now;
    const to = input.to ?? new Date(from.getTime() + input.lookAheadHours * 60 * 60 * 1000);

    const targetBlisters = resolveMcpBlisterTargets(context, input);

    const items = await Promise.all(
      targetBlisters.map(async (blister) => {
        const [treatmentsResult, medicinesResult] = await Promise.all([
          treatmentsList(blister.blisterId, { page: 1, limit: 100 }),
          medicinesList(blister.blisterId, { page: 1, limit: 100 }),
        ]);

        const medicinesById = new Map(
          medicinesResult.medicines.map((medicine) => [medicine.id, medicine.alias ?? medicine.nombre]),
        );

        return treatmentsResult.treatments
          .filter((treatment) => treatment.active)
          .flatMap((treatment) =>
            treatment.medicines
              .map((entry) => {
                const nextDoseAt = computeNextDose({
                  startDate: entry.firstDoseAt,
                  endDate: treatment.endDate,
                  active: treatment.active,
                  timeZone: treatment.timeZone,
                }, {
                  firstDoseAt: entry.firstDoseAt,
                  scheduleType: entry.scheduleType,
                  frequencyHours: entry.frequencyHours,
                  dailyDoseTimes: entry.dailyDoseTimes,
                  isRecurring: entry.isRecurring,
                }, from);

                if (!nextDoseAt || nextDoseAt < from || nextDoseAt > to) {
                  return null;
                }

                return {
                  blisterId: blister.blisterId,
                  blisterName: blister.blisterName,
                  treatmentId: treatment.id,
                  treatmentTitle: treatment.title,
                  medicineId: entry.medicineId,
                  medicineName: medicinesById.get(entry.medicineId) ?? 'Medicamento',
                  amount: entry.amount,
                  nextDoseAt,
                };
              })
              .filter((value): value is NonNullable<typeof value> => value !== null),
          );
      }),
    );

    return {
      items: items.flat().sort((left, right) => left.nextDoseAt.getTime() - right.nextDoseAt.getTime()),
    };
  },
};
