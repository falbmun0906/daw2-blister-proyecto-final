import { appointmentsList } from '../../modules/appointments/appointments.service';
import { type McpAppointmentManagerTool } from '../types';
import { assertMcpBlisterAccess } from '../context';

export const appointmentManagerTool: McpAppointmentManagerTool = {
  name: 'appointment_manager',
  description:
    'Recupera citas medicas de blisters accesibles por el usuario MCP con filtro por rango de fechas.',
  run: async (context, input) => {
    const targetBlisters = input.blisterId
      ? [assertMcpBlisterAccess(context, input.blisterId)]
      : context.blisters;

    const appointmentsByBlister = await Promise.all(
      targetBlisters.map(async (blister) => {
        const result = await appointmentsList(blister.blisterId, { page: 1, limit: 100 });

        return result.appointments.map((appointment) => ({
          id: appointment.id,
          blisterId: appointment.blisterId,
          blisterName: blister.blisterName,
          title: appointment.title,
          date: appointment.date,
          treatmentId: appointment.treatmentId,
        }));
      }),
    );

    const from = input.from;
    const to = input.to;
    const filtered = appointmentsByBlister
      .flat()
      .filter((appointment) => {
        if (from && appointment.date < from) {
          return false;
        }

        if (to && appointment.date > to) {
          return false;
        }

        return true;
      })
      .sort((left, right) => left.date.getTime() - right.date.getTime());

    const offset = (input.page - 1) * input.limit;
    const paged = filtered.slice(offset, offset + input.limit);

    return {
      items: paged,
      meta: {
        page: input.page,
        limit: input.limit,
        total: filtered.length,
        totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / input.limit),
      },
    };
  },
};
