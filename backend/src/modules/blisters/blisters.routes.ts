import { Router } from 'express';

import {
  blisterParamsSchema,
  createBlisterSchema,
  createInviteSchema,
  joinBlisterSchema,
  memberIdParamsSchema,
  updateBlisterSchema,
} from '../../../../shared/schemas/index';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  blistersCreateController,
  blistersCreateInviteController,
  blistersDeleteController,
  blistersJoinController,
  blistersListController,
  blistersListMembersController,
  blistersRemoveMemberController,
  blistersUpdateController,
} from './blisters.controller';

export const blistersRouter = Router();

blistersRouter.use(authenticate);
blistersRouter.get('/', blistersListController);
blistersRouter.post('/', validate({ body: createBlisterSchema }), blistersCreateController);
blistersRouter.patch('/:id', validate({ params: blisterParamsSchema, body: updateBlisterSchema }), blistersUpdateController);
blistersRouter.delete('/:id', validate({ params: blisterParamsSchema }), blistersDeleteController);
blistersRouter.post(
  '/:id/invite',
  validate({ params: blisterParamsSchema, body: createInviteSchema }),
  blistersCreateInviteController,
);
blistersRouter.post('/join', validate({ body: joinBlisterSchema }), blistersJoinController);
blistersRouter.get('/:id/members', validate({ params: blisterParamsSchema }), blistersListMembersController);
blistersRouter.delete(
  '/:id/members/:memberId',
  validate({ params: memberIdParamsSchema }),
  blistersRemoveMemberController,
);
