import { Router } from 'express';

import {
  adherenceLogsListQuerySchema,
  blisterLogParamsSchema,
  createAdherenceLogSchema,
  logIdParamsSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { checkBlisterAccess } from '../../middleware/checkBlisterAccess';
import { validate } from '../../middleware/validate';
import {
  adherenceLogsCreateController,
  adherenceLogsDeleteController,
  adherenceLogsListController,
} from './adherence.controller';

export const adherenceRouter = Router();

adherenceRouter.use(authenticate);

/**
 * @openapi
 * /blisters/{blisterId}/logs:
 *   get:
 *     summary: List adherence logs for a blister
 *     tags:
 *       - Adherence
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
 *         description: Paginated adherence logs collection.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: User does not belong to the blister.
 *       404:
 *         description: Blister not found.
 *   post:
 *     summary: Register a medicine intake in a blister
 *     tags:
 *       - Adherence
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Adherence log created and stock updated.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Medicine or treatment not found in the blister.
 *       422:
 *         description: Insufficient stock without force confirmation.
 */
adherenceRouter.get(
  '/:blisterId/logs',
  validate({ params: blisterLogParamsSchema, query: adherenceLogsListQuerySchema }),
  checkBlisterAccess,
  adherenceLogsListController,
);
adherenceRouter.post(
  '/:blisterId/logs',
  validate({ params: blisterLogParamsSchema, body: createAdherenceLogSchema }),
  checkBlisterAccess,
  adherenceLogsCreateController,
);

/**
 * @openapi
 * /blisters/{blisterId}/logs/{id}:
 *   delete:
 *     summary: Undo an adherence log
 *     tags:
 *       - Adherence
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
 *         description: Adherence log removed and stock restored.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Only the log author can undo the action.
 *       404:
 *         description: Adherence log not found.
 *       422:
 *         description: Undo window expired.
 */
adherenceRouter.delete(
  '/:blisterId/logs/:id',
  validate({ params: logIdParamsSchema }),
  checkBlisterAccess,
  adherenceLogsDeleteController,
);
