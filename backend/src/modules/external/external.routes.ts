import { Router } from 'express';

import {
  externalSearchQuerySchema,
  medicineSearchParamsSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  externalInfoController,
  externalSearchController,
} from './external.controller';

export const externalRouter = Router({ mergeParams: true });

externalRouter.use(authenticate);

/**
 * @openapi
 * /external/search:
 *   get:
 *     summary: Search medicines in CIMA by name
 *     tags:
 *       - External
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Free-text medicine name query.
 *     responses:
 *       200:
 *         description: Search results fetched from CIMA.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Missing or invalid JWT.
 *       502:
 *         description: Upstream CIMA service unavailable.
 */
externalRouter.get(
  '/search',
  validate({ query: externalSearchQuerySchema }),
  externalSearchController,
);

/**
 * @openapi
 * /external/info/{nregist}:
 *   get:
 *     summary: Get the official CIMA medicine record
 *     tags:
 *       - External
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nregist
 *         required: true
 *         schema:
 *           type: string
 *         description: Official numeric AEMPS registry id.
 *     responses:
 *       200:
 *         description: Official medicine information and photo references.
 *       400:
 *         description: Invalid nregist parameter.
 *       401:
 *         description: Missing or invalid JWT.
 *       404:
 *         description: Medicine not found in CIMA.
 */
externalRouter.get(
  '/info/:nregist',
  validate({ params: medicineSearchParamsSchema }),
  externalInfoController,
);
