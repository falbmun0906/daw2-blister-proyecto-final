import {
  appointmentsAddComment,
  appointmentsDeleteComment,
  appointmentsGet,
  appointmentsUpdateComment,
} from '../../modules/appointments/appointments.service';
import { resolveMcpBlister } from '../blister-resolver';
import { assertMcpWriterRole } from '../context';
import { type McpAppointmentCommentManagerTool } from '../types';
import { toMcpAppointmentItem } from './appointment-manager.tool';

export const appointmentCommentManagerTool: McpAppointmentCommentManagerTool = {
  name: 'appointment_comment_manager',
  description:
    'Lista, añade, edita o elimina comentarios de una cita medica de un blister accesible. Las mutaciones respetan rol OWNER/CAREGIVER y autoria del comentario.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    if (input.action !== 'list') {
      assertMcpWriterRole(blister);
    }
    const appointment = input.action === 'list'
      ? await appointmentsGet(blister.blisterId, input.appointmentId)
      : input.action === 'add'
      ? await appointmentsAddComment(
          blister.blisterId,
          input.appointmentId,
          context.userId,
          blister.role,
          { text: input.text! },
        )
      : input.action === 'update'
      ? await appointmentsUpdateComment(
          blister.blisterId,
          input.appointmentId,
          input.commentId!,
          context.userId,
          blister.role,
          { text: input.text! },
        )
      : await appointmentsDeleteComment(
          blister.blisterId,
          input.appointmentId,
          input.commentId!,
          context.userId,
          blister.role,
        );

    return {
      appointment: toMcpAppointmentItem(appointment, blister),
    };
  },
};