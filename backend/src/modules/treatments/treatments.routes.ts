import { Router } from 'express';

import {
  blisterTreatmentParamsSchema,
  createTreatmentSchema,
  treatmentIdParamsSchema,
  treatmentsListQuerySchema,
  updateTreatmentSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { checkBlisterAccess } from '../../middleware/checkBlisterAccess';
import { validate } from '../../middleware/validate';
import {
  treatmentsCreateController,
  treatmentsDeleteController,
  treatmentsListController,
  treatmentsUpdateController,
} from './treatments.controller';

export const treatmentsRouter = Router();

treatmentsRouter.use(authenticate);

/**
 * @openapi
 * /blisters/{blisterId}/treatments:
 *   get:
 *     summary: List treatments for a blister
 *     tags:
 *       - Treatments
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
 *         description: Paginated treatment collection.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: User does not belong to the blister.
 *       404:
 *         description: Blister not found.
 *   post:
 *     summary: Create a treatment in a blister
 *     tags:
 *       - Treatments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Treatment created.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: One or more medicines do not belong to the blister.
 */
treatmentsRouter.get(
  '/:blisterId/treatments',
  validate({ params: blisterTreatmentParamsSchema, query: treatmentsListQuerySchema }),
  checkBlisterAccess,
  treatmentsListController,
);
treatmentsRouter.post(
  '/:blisterId/treatments',
  validate({ params: blisterTreatmentParamsSchema, body: createTreatmentSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  treatmentsCreateController,
);

/**
 * @openapi
 * /blisters/{blisterId}/treatments/{id}:
 *   patch:
 *     summary: Update a treatment
 *     tags:
 *       - Treatments
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
 *         description: Treatment updated.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Treatment or linked medicine not found.
 *   delete:
 *     summary: Delete a treatment
 *     tags:
 *       - Treatments
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
 *         description: Treatment deleted.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Treatment not found.
 */
treatmentsRouter.patch(
  '/:blisterId/treatments/:id',
  validate({ params: treatmentIdParamsSchema, body: updateTreatmentSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  treatmentsUpdateController,
);
treatmentsRouter.delete(
  '/:blisterId/treatments/:id',
  validate({ params: treatmentIdParamsSchema }),
  checkBlisterAccess,
  authorize(['OWNER', 'CAREGIVER']),
  treatmentsDeleteController,
);
