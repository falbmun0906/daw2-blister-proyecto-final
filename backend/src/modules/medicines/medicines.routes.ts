import { Router } from 'express';

import {
  blisterMedicineParamsSchema,
  createMedicineSchema,
  medicineIdParamsSchema,
  medicinesListQuerySchema,
  updateMedicineSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { checkBlisterAccess } from '../../middleware/checkBlisterAccess';
import { validate } from '../../middleware/validate';
import {
  medicinesCreateController,
  medicinesDeleteController,
  medicinesListController,
  medicinesUpdateController,
} from './medicines.controller';

export const medicinesRouter = Router();

medicinesRouter.use(authenticate);

/**
 * @openapi
 * /blisters/{blisterId}/medicines:
 *   get:
 *     summary: List the blister inventory
 *     tags:
 *       - Medicines
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
 *         description: Paginated medicine inventory.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: User does not belong to the blister.
 *       404:
 *         description: Blister not found.
 *   post:
 *     summary: Add a medicine to the blister inventory from CIMA
 *     tags:
 *       - Medicines
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blisterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nregist, stock, stockUnit, expDate]
 *             properties:
 *               nregist:
 *                 type: string
 *               alias:
 *                 type: string
 *               stock:
 *                 type: integer
 *               stockUnit:
 *                 type: string
 *               threshold:
 *                 type: integer
 *               expDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Medicine created from official CIMA data.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Blister or CIMA medicine not found.
 */
medicinesRouter.get(
  '/:blisterId/medicines',
  validate({ params: blisterMedicineParamsSchema, query: medicinesListQuerySchema }),
  checkBlisterAccess,
  medicinesListController,
);
medicinesRouter.post(
  '/:blisterId/medicines',
  validate({ params: blisterMedicineParamsSchema, body: createMedicineSchema }),
  checkBlisterAccess,
  medicinesCreateController,
);

/**
 * @openapi
 * /blisters/{blisterId}/medicines/{id}:
 *   patch:
 *     summary: Update local stock metadata for a blister medicine
 *     tags:
 *       - Medicines
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
 *         description: Medicine updated.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Role does not allow writing in this blister.
 *       404:
 *         description: Medicine not found.
 *   delete:
 *     summary: Delete a blister medicine
 *     tags:
 *       - Medicines
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
 *         description: Medicine deleted.
 *       401:
 *         description: Missing or invalid JWT.
 *       403:
 *         description: Owner role required.
 *       404:
 *         description: Medicine not found.
 */
medicinesRouter.patch(
  '/:blisterId/medicines/:id',
  validate({ params: medicineIdParamsSchema, body: updateMedicineSchema }),
  checkBlisterAccess,
  medicinesUpdateController,
);
medicinesRouter.delete(
  '/:blisterId/medicines/:id',
  validate({ params: medicineIdParamsSchema }),
  checkBlisterAccess,
  medicinesDeleteController,
);
