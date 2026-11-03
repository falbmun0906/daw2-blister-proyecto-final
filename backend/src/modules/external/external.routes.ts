import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  externalSearchQuerySchema,
  medicineSearchParamsSchema,
  nationalCodeParamsSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  externalInfoController,
  externalNationalCodeController,
  externalSearchController,
} from './external.controller';

export const externalRouter = Router({ mergeParams: true });

externalRouter.use(authenticate);

/**
 * @openapi
 * /external/national-code/{cn}:
 *   get:
 *     summary: Resolve a Spanish national presentation code through CIMA
 *     tags: [External]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cn
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: Official medicine information with cn and presentationName when provided by CIMA.
 *       400:
 *         description: Invalid national code.
 *       401:
 *         description: Missing or invalid JWT.
 *       404:
 *         description: National code not found in CIMA.
 *       429:
 *         description: Rate limit reached (30 requests per minute per IP).
 *       502:
 *         description: Upstream CIMA service unavailable.
 */
externalRouter.get(
  '/national-code/:cn',
  rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }),
  validate({ params: nationalCodeParamsSchema }),
  externalNationalCodeController,
);

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
