import { appointmentsCreate } from '../../modules/appointments/appointments.service';
import { zonedTimeToDate } from '../../utils/time-zone';
import { resolveMcpBlister } from '../blister-resolver';
import { assertMcpWriterRole } from '../context';
import { type McpAppointmentCreateTool } from '../types';
import { toMcpAppointmentItem } from './appointment-manager.tool';

const EXPLICIT_OFFSET_PATTERN = /(z|[+-]\d{2}:?\d{2})$/i;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/;

const parseAppointmentDate = (date: string, timeZone?: string): Date => {
  const value = date.trim();

  if (EXPLICIT_OFFSET_PATTERN.test(value)) {
    return new Date(value);
  }

  const localDateTime = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (localDateTime) {
    return zonedTimeToDate(localDateTime[1] as string, localDateTime[2] as string, timeZone);
  }

  return new Date(value);
};

export const appointmentCreateTool: McpAppointmentCreateTool = {
  name: 'appointment_create',
  description:
    'Crea una cita medica en un blister accesible. Requiere rol OWNER o CAREGIVER y valida que el paciente pertenece al blister. Para horas locales, envia date sin offset, por ejemplo "2031-07-10T18:00:00", junto con timeZone IANA como "Europe/Madrid". Si date incluye Z u offset, se respeta ese instante UTC y timeZone solo queda como contexto.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    assertMcpWriterRole(blister);
    const appointment = await appointmentsCreate(blister.blisterId, blister.role, {
      patientUserId: input.patientUserId,
      title: input.title,
      location: input.location ?? null,
      description: input.description ?? null,
      date: parseAppointmentDate(input.date, input.timeZone),
      treatmentId: input.treatmentId ?? null,
    });

    return {
      appointment: toMcpAppointmentItem(appointment, blister),
    };
  },
};