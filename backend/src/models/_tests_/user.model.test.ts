import { Types } from 'mongoose';

import { UserModel } from '../user.model';
import { findSchemaIndex } from './schema-test.utils';

describe('UserModel', () => {
  it('applies secure defaults for settings and soft delete support', () => {
    const user = new UserModel({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ANA@EXAMPLE.COM',
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
    });

    expect(user.validateSync()).toBeUndefined();
    expect(user.email).toBe('ana@example.com');
    expect(user.settings.theme).toBe('system');
    expect(user.settings.font).toBe('standard');
    expect(user.settings.fontSize).toBe('normal');
    expect(user.deletedAt).toBeNull();
  });

  it('declares unique indexes for username, email and sparse MCP token', () => {
    const indexes = UserModel.schema.indexes();

    expect(findSchemaIndex(indexes, { username: 1 })?.options.unique).toBe(true);
    expect(findSchemaIndex(indexes, { email: 1 })?.options.unique).toBe(true);
    expect(findSchemaIndex(indexes, { mcpToken: 1 })?.options).toMatchObject({
      unique: true,
      sparse: true,
    });
  });

  it('rejects invalid emails', () => {
    const invalidUser = new UserModel({
      _id: new Types.ObjectId(),
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana',
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
    });

    const validationError = invalidUser.validateSync();

    expect(validationError?.errors.email).toBeDefined();
  });
});
