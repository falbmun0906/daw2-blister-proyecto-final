import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_NOT_FOUND,
} from '../constants/http.constants';
import { AppError } from '../utils/app-error';
import { assertMcpBlisterAccess } from './context';
import { type McpAuthContext, type McpBlisterContext } from './types';

interface McpBlisterLocator {
  blisterId?: string;
  blisterName?: string;
}

const normalizeBlisterName = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toCandidateDetails = (blisters: McpBlisterContext[]): string[] =>
  blisters.map((blister) => `${blister.blisterName} (${blister.blisterId}, role ${blister.role})`);

export const resolveMcpBlister = (context: McpAuthContext, locator: McpBlisterLocator): McpBlisterContext => {
  if (locator.blisterId && locator.blisterName) {
    throw new AppError({
      code: 'MCP_BLISTER_LOCATOR_CONFLICT',
      message: 'Use either blisterId or blisterName, not both.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  if (locator.blisterId) {
    return assertMcpBlisterAccess(context, locator.blisterId);
  }

  if (!locator.blisterName) {
    throw new AppError({
      code: 'MCP_BLISTER_REQUIRED',
      message: 'A blisterId or blisterName is required for this MCP tool.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  const normalizedName = normalizeBlisterName(locator.blisterName);
  const matches = context.blisters.filter(
    (blister) => normalizeBlisterName(blister.blisterName) === normalizedName,
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new AppError({
      code: 'MCP_BLISTER_AMBIGUOUS',
      message: 'More than one accessible blister matches that name. Use blisterId.',
      statusCode: HTTP_STATUS_CONFLICT,
      details: toCandidateDetails(matches),
    });
  }

  throw new AppError({
    code: 'MCP_BLISTER_NOT_FOUND',
    message: 'No accessible blister matches that name.',
    statusCode: HTTP_STATUS_NOT_FOUND,
    details: toCandidateDetails(context.blisters),
  });
};

export const resolveMcpBlisterTargets = (
  context: McpAuthContext,
  locator: McpBlisterLocator,
): McpBlisterContext[] => {
  if (locator.blisterId || locator.blisterName) {
    return [resolveMcpBlister(context, locator)];
  }

  return context.blisters;
};