import { Types } from 'mongoose';

import { AdherenceLogModel } from '../adherenceLog.model';
import { findSchemaIndex } from './schema-test.utils';

describe('AdherenceLogModel', () => {
  it('assigns timestamp and force defaults', () => {
    const log = new AdherenceLogModel({
      blisterId: new Types.ObjectId(),
      medicineId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      treatmentId: new Types.ObjectId(),
    });

    expect(log.validateSync()).toBeUndefined();
    expect(log.amount).toBe(0);
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.isForced).toBe(false);
    expect(log.notes).toBeNull();
  });

  it('declares the blister and timestamp audit index', () => {
    const index = findSchemaIndex(AdherenceLogModel.schema.indexes(), { blisterId: 1, timestamp: -1 });

    expect(index).toBeDefined();
  });
});
