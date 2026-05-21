import { Types } from 'mongoose';

import { BlisterModel } from '../blister.model';
import { findSchemaIndex } from './schema-test.utils';

describe('BlisterModel', () => {
  it('requires at least one member and keeps invite metadata optional', () => {
    const blister = new BlisterModel({
      name: 'Casa Abuela',
      members: [
        {
          userId: new Types.ObjectId(),
          role: 'OWNER',
        },
      ],
    });

    expect(blister.validateSync()).toBeUndefined();
    expect(blister.inviteCode).toBeNull();
    expect(blister.deletedAt).toBeNull();
  });

  it('declares a unique sparse index for invitation codes', () => {
    const index = findSchemaIndex(BlisterModel.schema.indexes(), { 'inviteCode.code': 1 });

    expect(index?.options).toMatchObject({
      unique: true,
      sparse: true,
    });
  });

  it('rejects empty member arrays', () => {
    const blister = new BlisterModel({
      name: 'Casa Abuela',
      members: [],
    });

    const validationError = blister.validateSync();

    expect(validationError?.errors.members).toBeDefined();
  });
});
