import { PasswordResetTokenModel } from '../passwordResetToken.model';
import { findSchemaIndex } from './schema-test.utils';

describe('PasswordResetTokenModel', () => {
  it('stores hashed reset token metadata and declares a TTL index', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const token = new PasswordResetTokenModel({
      tokenHash: 'hashed-reset-token',
      userId: '507f1f77bcf86cd799439011',
      expiresAt,
    });

    expect(token.validateSync()).toBeUndefined();
    expect(token.tokenHash).toBe('hashed-reset-token');
    expect(token.userId).toBe('507f1f77bcf86cd799439011');
    expect(token.expiresAt).toEqual(expiresAt);
    expect(token.createdAt).toBeInstanceOf(Date);

    const indexes = PasswordResetTokenModel.schema.indexes();

    expect(findSchemaIndex(indexes, { tokenHash: 1 })?.options.unique).toBe(true);
    expect(findSchemaIndex(indexes, { expiresAt: 1 })?.options.expireAfterSeconds).toBe(0);
  });
});
