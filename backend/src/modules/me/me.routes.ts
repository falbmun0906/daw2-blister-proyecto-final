import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { meCalendarController, meUpcomingDosesController } from './me.controller';

export const meRouter = Router();

meRouter.use(authenticate);

/**
 * @openapi
 * /me/upcoming-doses:
 *   get:
 *     summary: List upcoming doses across blisters of the authenticated user
 *     tags:
 *       - Me
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: blisterId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aggregated upcoming doses for every blister of the user.
 */
meRouter.get('/upcoming-doses', meUpcomingDosesController);

/**
 * @openapi
 * /me/calendar:
 *   get:
 *     summary: Calendar (appointments + doses) across blisters of the user
 *     tags:
 *       - Me
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: blisterId
 *         schema:
 *           type: string
 *       - in: query
 *         name: kinds
 *         schema:
 *           type: string
 *           description: Comma separated list with `appointments`, `doses` (defaults to both).
 *     responses:
 *       200:
 *         description: Calendar payload combining appointments and doses.
 */
meRouter.get('/calendar', meCalendarController);
