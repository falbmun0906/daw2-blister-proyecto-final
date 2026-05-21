import { Router } from 'express';

import {
  appointmentCommentBodySchema,
  appointmentCommentParamsSchema,
  appointmentIdParamsSchema,
  appointmentsListQuerySchema,
  blisterAppointmentParamsSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { checkBlisterAccess } from '../../middleware/checkBlisterAccess';
import { validate } from '../../middleware/validate';
import {
  appointmentsAddCommentController,
  appointmentsCreateController,
  appointmentsDeleteCommentController,
  appointmentsDeleteController,
  appointmentsListController,
  appointmentsUpdateCommentController,
  appointmentsUpdateController,
} from './appointments.controller';

export const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

/**
 * @openapi
 * /blisters/{blisterId}/appointments:
 *   get:
 *     summary: List appointments for a blister
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blisterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated appointment collection.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: User does not belong to the blister.
 *       404:
 *         description: Blister not found.
 *   post:
 *     summary: Create an appointment in a blister
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Appointment created.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Linked treatment not found in the blister.
 */
appointmentsRouter.get(
  '/:blisterId/appointments',
  validate({ params: blisterAppointmentParamsSchema, query: appointmentsListQuerySchema }),
  checkBlisterAccess,
  appointmentsListController,
);
appointmentsRouter.post(
  '/:blisterId/appointments',
  validate({ params: blisterAppointmentParamsSchema, body: createAppointmentSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsCreateController,
);

/**
 * @openapi
 * /blisters/{blisterId}/appointments/{id}:
 *   patch:
 *     summary: Update an appointment
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blisterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment updated.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Appointment or linked treatment not found.
 *   delete:
 *     summary: Delete an appointment
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blisterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment deleted.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Appointment not found.
 */
appointmentsRouter.patch(
  '/:blisterId/appointments/:id',
  validate({ params: appointmentIdParamsSchema, body: updateAppointmentSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsUpdateController,
);
appointmentsRouter.post(
  '/:blisterId/appointments/:id/comments',
  validate({ params: appointmentIdParamsSchema, body: appointmentCommentBodySchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsAddCommentController,
);
appointmentsRouter.patch(
  '/:blisterId/appointments/:id/comments/:commentId',
  validate({ params: appointmentCommentParamsSchema, body: appointmentCommentBodySchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsUpdateCommentController,
);
appointmentsRouter.delete(
  '/:blisterId/appointments/:id/comments/:commentId',
  validate({ params: appointmentCommentParamsSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsDeleteCommentController,
);
appointmentsRouter.delete(
  '/:blisterId/appointments/:id',
  validate({ params: appointmentIdParamsSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  appointmentsDeleteController,
);
