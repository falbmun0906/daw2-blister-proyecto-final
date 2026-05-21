import { z } from 'zod';

import { nonEmptyTrimmedString } from './common.schema';

export const systemMetaSchema = z.object({
  key: nonEmptyTrimmedString('Key', 100),
  value: z.record(z.string(), z.unknown()),
});

export type SystemMetaInput = z.infer<typeof systemMetaSchema>;
