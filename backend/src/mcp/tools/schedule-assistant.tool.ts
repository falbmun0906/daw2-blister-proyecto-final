import { upcomingDosesQuerySchema } from '../../../../shared/schemas';
import { meUpcomingDoses } from '../../modules/me/me.service';
import { type McpScheduleAssistantTool } from '../types';
import { resolveMcpBlisterTargets } from '../blister-resolver';

export const scheduleAssistantTool: McpScheduleAssistantTool = {
  name: 'schedule_assistant',
  description: 'Calcula la próxima dosis pendiente de cada pauta activa, con paciente, unidad y ajuste horario; excluye tomas registradas y omitidas.',
  run: async (context, input) => {
    const from = input.from ?? new Date();
    const to = input.to ?? new Date(from.getTime() + input.lookAheadHours * 3_600_000);
    const blisters = resolveMcpBlisterTargets(context, input);
    const groups = await Promise.all(blisters.map(async (blister) => {
      const query = upcomingDosesQuerySchema.parse({ from, to, blisterId: blister.blisterId, includeTaken: false });
      const doses = await meUpcomingDoses(context.userId, query);
      const seen = new Set<string>();
      return doses.filter((dose) => {
        const key = `${dose.treatmentId}:${dose.medicineId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map((dose) => ({
        blisterId: dose.blisterId, blisterName: dose.blisterName,
        treatmentId: dose.treatmentId, treatmentTitle: dose.treatmentTitle,
        medicineId: dose.medicineId, medicineName: dose.medicineName,
        amount: dose.amount, stockUnit: dose.stockUnit,
        patientUserId: dose.patientUserId, patientName: dose.patientName,
        nextDoseAt: dose.doseAt, timeZone: dose.timeZone,
        scheduledTime: dose.scheduledTime, isTimeAdjusted: dose.isTimeAdjusted,
      }));
    }));
    return { items: groups.flat().sort((left, right) => left.nextDoseAt.getTime() - right.nextDoseAt.getTime()) };
  },
};
