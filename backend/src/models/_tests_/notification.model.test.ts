import { Types } from 'mongoose';

import { NotificationModel } from '../notification.model';
import { findSchemaIndex } from './schema-test.utils';

describe('NotificationModel', () => {
  it('defaults notifications to unread', () => {
    const notification = new NotificationModel({
      userId: new Types.ObjectId(),
      type: 'stock_low',
      severity: 'warning',
      title: 'Stock bajo',
      message: 'Quedan pocas unidades',
    });

    expect(notification.validateSync()).toBeUndefined();
    expect(notification.isRead).toBe(false);
    expect(notification.blisterId).toBeNull();
    expect(notification.metadata).toBeNull();
    expect(notification.createdAt).toBeInstanceOf(Date);
  });

  it('declares the recipient unread index', () => {
    const index = findSchemaIndex(NotificationModel.schema.indexes(), {
      userId: 1,
      isRead: 1,
      createdAt: -1,
    });

    expect(index).toBeDefined();
  });
});
