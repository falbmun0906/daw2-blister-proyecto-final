import {
  notificationIdParamsSchema,
  notificationSchema,
  notificationsListQuerySchema,
} from '../notification.schema';

describe('notification shared schemas', () => {
  it('applies pagination defaults for notifications collections', () => {
    expect(notificationsListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('requires title, type and severity', () => {
    const result = notificationSchema.safeParse({
      message: 'Mensaje',
    });

    expect(result.success).toBe(false);
  });

  it('validates notification ids as ObjectId params', () => {
    const result = notificationIdParamsSchema.safeParse({
      id: 'invalid-id',
    });

    expect(result.success).toBe(false);
  });
});
