import type { Request, Response } from 'express';

import { HTTP_STATUS_OK } from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import {
  calendarQuerySchema,
  upcomingDosesQuerySchema,
  type CalendarQuery,
  type UpcomingDosesQuery,
} from '../../../../shared/schemas';
import { meCalendar, meUpcomingDoses } from './me.service';

/**
 * Returns the upcoming doses across every blister the authenticated user
 * belongs to, optionally restricted to a single blister.
 */
export const meUpcomingDosesController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const query = upcomingDosesQuerySchema.parse(request.query) as UpcomingDosesQuery;
  const result = await meUpcomingDoses(authenticatedRequest.auth.userId, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Returns the calendar payload (appointments and/or doses) across blisters.
 */
export const meCalendarController = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const query = calendarQuerySchema.parse(request.query) as CalendarQuery;
  const result = await meCalendar(authenticatedRequest.auth.userId, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};
