import { z } from 'zod';

import { dateSchema } from './common.schema';
import { systemSyncStatuses } from './schema.constants';

export const systemMetaSchema = z.object({
  lastCimaSync: dateSchema('lastCimaSync'),
  syncStatus: z.enum(systemSyncStatuses),
});

export type SystemMetaInput = z.infer<typeof systemMetaSchema>;
