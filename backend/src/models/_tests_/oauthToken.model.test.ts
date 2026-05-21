import { OAuthTokenModel } from '../oauthToken.model';
import { findSchemaIndex } from './schema-test.utils';

describe('OAuthTokenModel', () => {
  it('stores hashed refresh token metadata and declares a TTL index', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const token = new OAuthTokenModel({
      refreshToken: 'hashed-refresh-token',
      clientId: 'mcp-client',
      userId: '507f1f77bcf86cd799439011',
      scope: 'mcp',
      expiresAt,
    });

    expect(token.validateSync()).toBeUndefined();
    expect(token.refreshToken).toBe('hashed-refresh-token');
    expect(token.clientId).toBe('mcp-client');
    expect(token.userId).toBe('507f1f77bcf86cd799439011');
    expect(token.scope).toBe('mcp');
    expect(token.expiresAt).toEqual(expiresAt);
    expect(token.createdAt).toBeInstanceOf(Date);

    const indexes = OAuthTokenModel.schema.indexes();

    expect(findSchemaIndex(indexes, { refreshToken: 1 })?.options.unique).toBe(true);
    expect(findSchemaIndex(indexes, { expiresAt: 1 })?.options.expireAfterSeconds).toBe(0);
  });
});