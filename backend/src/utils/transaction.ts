import mongoose, { type ClientSession } from 'mongoose';

import { AppError } from './app-error';

/** No standalone fallback: a partial stock/log write is never acceptable. */
export const inTransaction = async <T>(work: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session), {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 20) {
      throw new AppError({
        code: 'TRANSACTIONS_REQUIRED',
        message: 'This operation requires a MongoDB replica set. No changes were applied.',
        statusCode: 503,
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
