import { Router } from 'express';

import {
  blisterMedicineParamsSchema,
  createMedicineSchema,
  medicineIdParamsSchema,
  medicinesListQuerySchema,
  updateMedicineSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
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
 *     summary: Add a CIMA medicine or a user-defined product to the inventory
 *     description: An omitted source retains the legacy CIMA behavior. Custom products never accept official metadata. The user must review photo recognition before submitting.
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
 *             required: [stock, stockUnit, expDate]
 *             properties:
 *               alias:
 *                 type: string
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 multipleOf: 0.5
 *               stockUnit:
 *                 type: string
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 multipleOf: 0.5
 *                 default: 5
 *               captureMethod:
 *                 type: string
 *                 enum: [search, manual, ocr, barcode]
 *             oneOf:
 *               - type: object
 *                 required: [nregist]
 *                 properties:
 *                   source:
 *                     type: string
 *                     enum: [cima]
 *                   nregist:
 *                     type: string
 *                     pattern: '^\d+$'
 *                   cn:
 *                     type: string
 *                     pattern: '^\d{6}$'
 *                     description: Optional national presentation code, verified against nregist by the server.
 *                   expDate:
 *                     type: string
 *                     format: date-time
 *                     description: Future expiry date.
 *               - type: object
 *                 required: [source, nombre, customDetails]
 *                 properties:
 *                   source:
 *                     type: string
 *                     enum: [custom]
 *                   nombre:
 *                     type: string
 *                     maxLength: 200
 *                   customDetails:
 *                     $ref: '#/components/schemas/CustomMedicineDetails'
 *                   expDate:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     description: Future expiry date, or null when unknown.
 *     responses:
 *       201:
 *         description: Inventory item created. Custom records have null official metadata and may have null expDate.
 *       400:
 *         description: Invalid fields or a national code that does not match the registry.
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
  authorize(['OWNER', 'CAREGIVER']),
  medicinesCreateController,
);

/**
 * @openapi
 * /blisters/{blisterId}/medicines/{id}:
 *   patch:
 *     summary: Update inventory data or user-defined product details
 *     description: Identity fields nombre and customDetails are only editable for custom products. Only custom products can clear expDate with null. Source, stockUnit and official data cannot change.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               alias:
 *                 type: string
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 multipleOf: 0.5
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 multipleOf: 0.5
 *               expDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               nombre:
 *                 type: string
 *                 maxLength: 200
 *               customDetails:
 *                 $ref: '#/components/schemas/CustomMedicineDetails'
 *     responses:
 *       200:
 *         description: Medicine updated.
 *       409:
 *         description: MEDICINE_IDENTITY_LOCKED if identity has been used in a treatment or dose; MEDICINE_UPDATE_CONFLICT for a concurrent inventory edit.
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
  authorize(['OWNER', 'CAREGIVER']),
  medicinesUpdateController,
);
medicinesRouter.delete(
  '/:blisterId/medicines/:id',
  validate({ params: medicineIdParamsSchema }),
  checkBlisterAccess,
  authorize(['OWNER']),
  medicinesDeleteController,
);

/**
 * @openapi
 * components:
 *   schemas:
 *     CustomMedicineDetails:
 *       type: object
 *       additionalProperties: false
 *       required: [productType]
 *       properties:
 *         productType:
 *           type: string
 *           enum: [medicine, supplement, other]
 *         brand:
 *           type: string
 *           maxLength: 100
 *         composition:
 *           type: string
 *           maxLength: 300
 *         format:
 *           type: string
 *           maxLength: 100
 *         strength:
 *           type: string
 *           maxLength: 100
 *           description: User-entered label text. Never a prescribed dose or stock conversion.
 */
