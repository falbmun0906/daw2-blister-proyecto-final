import { appointmentsList } from '../../modules/appointments/appointments.service';
import { resolveMcpBlisterTargets } from '../blister-resolver';
import { type McpAppointmentItem, type McpAppointmentManagerTool, type McpBlisterContext } from '../types';

type AppointmentView = Awaited<ReturnType<typeof appointmentsList>>['appointments'][number];

export const toMcpAppointmentItem = (
  appointment: AppointmentView,
  blister: McpBlisterContext,
): McpAppointmentItem => ({
  id: appointment.id,
  blisterId: appointment.blisterId,
  blisterName: blister.blisterName,
  patientUserId: appointment.patientUserId,
  title: appointment.title,
  location: appointment.location,
  description: appointment.description,
  date: appointment.date,
  treatmentId: appointment.treatmentId,
  comments: appointment.comments,
});

export const appointmentManagerTool: McpAppointmentManagerTool = {
  name: 'appointment_manager',
  description:
    'Recupera citas medicas de blisters accesibles por el usuario MCP con filtro por blisterId, blisterName y rango de fechas, incluyendo comentarios.',
  run: async (context, input) => {
    const targetBlisters = resolveMcpBlisterTargets(context, input);

    const appointmentsByBlister = await Promise.all(
      targetBlisters.map(async (blister) => {
        const result = await appointmentsList(blister.blisterId, { page: 1, limit: 100 });

        return result.appointments.map((appointment) => toMcpAppointmentItem(appointment, blister));
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
