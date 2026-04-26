import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import {
  blistersCreate,
  blistersCreateInvite,
  blistersDelete,
  blistersJoin,
  blistersList,
  blistersListMembers,
  blistersRemoveMember,
  blistersUpdateMemberRole,
  blistersUpdate,
} from './blisters.service';
import {
  type CreateBlisterInput,
  type CreateInviteInput,
  type JoinBlisterInput,
  type UpdateMemberRoleInput,
  type UpdateBlisterInput,
} from '../../../../shared/schemas/index';

/**
 * Lists all active blisters for the authenticated user.
 */
export const blistersListController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await blistersList(authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Creates a new blister owned by the authenticated user.
 */
export const blistersCreateController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await blistersCreate(
    authenticatedRequest.auth.userId,
    request.body as CreateBlisterInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Updates a blister for an authenticated owner.
 */
export const blistersUpdateController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const blisterId = request.params.id as string;
  const result = await blistersUpdate(
    blisterId,
    authenticatedRequest.auth.userId,
    request.body as UpdateBlisterInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Soft deletes a blister for an authenticated owner.
 */
export const blistersDeleteController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  await blistersDelete(request.params.id as string, authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};

/**
 * Creates a temporary invite code for an authenticated owner.
 */
export const blistersCreateInviteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const blisterId = request.params.id as string;
  const result = await blistersCreateInvite(
    blisterId,
    authenticatedRequest.auth.userId,
    request.body as CreateInviteInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Joins the authenticated user to a blister via invite code.
 */
export const blistersJoinController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await blistersJoin(
    authenticatedRequest.auth.userId,
    request.body as JoinBlisterInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Lists blister members for an authenticated member.
 */
export const blistersListMembersController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await blistersListMembers(
    request.params.id as string,
    authenticatedRequest.auth.userId,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Removes a member from the blister or allows voluntary self-leave.
 */
export const blistersRemoveMemberController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  await blistersRemoveMember(
    request.params.id as string,
    authenticatedRequest.auth.userId,
    request.params.memberId as string,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};

/**
 * Updates a member role for a blister owner.
 */
export const blistersUpdateMemberRoleController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await blistersUpdateMemberRole(
    request.params.id as string,
    authenticatedRequest.auth.userId,
    request.params.memberId as string,
    request.body as UpdateMemberRoleInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};
