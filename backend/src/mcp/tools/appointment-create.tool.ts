import { appointmentsCreate } from '../../modules/appointments/appointments.service';
import { resolveMcpBlister } from '../blister-resolver';
import { type McpAppointmentCreateTool } from '../types';
import { toMcpAppointmentItem } from './appointment-manager.tool';

export const appointmentCreateTool: McpAppointmentCreateTool = {
  name: 'appointment_create',
  description:
    'Crea una cita medica en un blister accesible. Requiere rol OWNER o CAREGIVER y valida que el paciente pertenece al blister.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    const appointment = await appointmentsCreate(blister.blisterId, blister.role, {
      patientUserId: input.patientUserId,
      title: input.title,
      location: input.location ?? null,
      description: input.description ?? null,
      date: input.date,
      treatmentId: input.treatmentId ?? null,
    });

    return {
      appointment: toMcpAppointmentItem(appointment, blister),
    };
  },
};