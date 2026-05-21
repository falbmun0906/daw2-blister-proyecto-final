import { PushSubscriptionModel } from '../pushSubscription.model';
import { findSchemaIndex } from './schema-test.utils';

describe('PushSubscriptionModel', () => {
  it('requires endpoint and browser encryption keys', () => {
    const subscription = new PushSubscriptionModel({
      userId: '507f1f77bcf86cd799439011',
      endpoint: 'https://push.example.test/subscription/1',
      keys: {
        p256dh: 'public-key',
        auth: 'auth-secret',
      },
    });

    const error = subscription.validateSync();

    expect(error).toBeUndefined();
    expect(subscription.updatedAt).toBeInstanceOf(Date);
  });

  it('indexes endpoint as unique', () => {
    const index = findSchemaIndex(PushSubscriptionModel.schema.indexes(), {
      endpoint: 1,
    });

    expect(index?.options).toMatchObject({ unique: true });
  });
});
