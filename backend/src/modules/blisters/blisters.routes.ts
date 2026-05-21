import { Router } from 'express';

import {
  blisterParamsSchema,
  createBlisterSchema,
  createInviteSchema,
  joinBlisterSchema,
  memberIdParamsSchema,
  updateMemberRoleSchema,
  updateBlisterSchema,
} from '../../../../shared/schemas/index';
import { authorize } from '../../middleware/authorize';
import { authenticate } from '../../middleware/authenticate';
import {
  checkBlisterAccess,
  checkBlisterAccessIncludingDeleted,
} from '../../middleware/checkBlisterAccess';
import { validate } from '../../middleware/validate';
import {
  blistersCreateController,
  blistersCreateInviteController,
  blistersDeleteController,
  blistersJoinController,
  blistersListController,
  blistersListMembersController,
  blistersRemoveMemberController,
  blistersRestoreController,
  blistersUpdateMemberRoleController,
  blistersUpdateController,
} from './blisters.controller';

export const blistersRouter = Router();

blistersRouter.use(authenticate);

const authorizeOwner = authorize(['OWNER'], {
  code: 'BLISTER_OWNER_REQUIRED',
  message: 'Owner role is required for this action.',
});

/**
 * @openapi
 * /blisters:
 *   get:
 *     summary: List the authenticated user blisters
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active blisters returned.
 *       401:
 *         description: Missing or invalid JWT.
 *   post:
 *     summary: Create a new blister
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Blister created.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Missing or invalid JWT.
 */
blistersRouter.get('/', blistersListController);
blistersRouter.post('/', validate({ body: createBlisterSchema }), blistersCreateController);

/**
 * @openapi
 * /blisters/{id}:
 *   patch:
 *     summary: Update a blister
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blister updated.
 *       403:
 *         description: Owner role required.
 *   delete:
 *     summary: Soft delete a blister
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blister soft deleted.
 *       403:
 *         description: Owner role required.
 */
blistersRouter.patch(
  '/:id',
  validate({ params: blisterParamsSchema, body: updateBlisterSchema }),
  checkBlisterAccess,
  authorizeOwner,
  blistersUpdateController,
);
blistersRouter.delete(
  '/:id',
  validate({ params: blisterParamsSchema }),
  checkBlisterAccess,
  authorizeOwner,
  blistersDeleteController,
);

/**
 * @openapi
 * /blisters/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted blister within the grace window
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blister restored.
 *       400:
 *         description: Blister is not in a deleted state.
 *       403:
 *         description: Owner role required.
 *       409:
 *         description: Grace period expired or user blister cap reached.
 */
blistersRouter.post(
  '/:id/restore',
  validate({ params: blisterParamsSchema }),
  checkBlisterAccessIncludingDeleted,
  authorizeOwner,
  blistersRestoreController,
);

/**
 * @openapi
 * /blisters/{id}/invite:
 *   post:
 *     summary: Create a blister invite code
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Invite created.
 *       403:
 *         description: Owner role required.
 */
blistersRouter.post(
  '/:id/invite',
  validate({ params: blisterParamsSchema, body: createInviteSchema }),
  checkBlisterAccess,
  authorizeOwner,
  blistersCreateInviteController,
);

/**
 * @openapi
 * /blisters/join:
 *   post:
 *     summary: Join a blister by invite code
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User joined the blister.
 *       400:
 *         description: Invalid or expired invite code.
 *       409:
 *         description: User already belongs to the blister.
 */
blistersRouter.post('/join', validate({ body: joinBlisterSchema }), blistersJoinController);

/**
 * @openapi
 * /blisters/{id}/members:
 *   get:
 *     summary: List blister members
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Members returned.
 *       403:
 *         description: User does not belong to the blister.
 */
blistersRouter.get(
  '/:id/members',
  validate({ params: blisterParamsSchema }),
  checkBlisterAccess,
  blistersListMembersController,
);

/**
 * @openapi
 * /blisters/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a blister member or leave the blister
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed.
 *       403:
 *         description: Owner role required for expelling others.
 *       404:
 *         description: Member not found.
 *       409:
 *         description: Operation would leave the blister without an owner.
 */
blistersRouter.delete(
  '/:id/members/:memberId',
  validate({ params: memberIdParamsSchema }),
  checkBlisterAccess,
  blistersRemoveMemberController,
);

/**
 * @openapi
 * /blisters/{id}/members/{memberId}/role:
 *   patch:
 *     summary: Update role for a blister member
 *     tags:
 *       - Blisters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member role updated.
 *       403:
 *         description: Owner role required.
 *       404:
 *         description: Member not found.
 *       409:
 *         description: Operation would leave the blister without an owner.
 */
blistersRouter.patch(
  '/:id/members/:memberId/role',
  validate({ params: memberIdParamsSchema, body: updateMemberRoleSchema }),
  checkBlisterAccess,
  authorizeOwner,
  blistersUpdateMemberRoleController,
);
