import mongoose from 'mongoose';

import { env } from './env';
import { AdherenceLogModel } from '../models/adherenceLog.model';
import { NotificationModel } from '../models/notification.model';

/**
 * Connects the backend to MongoDB.
 */
export const connectDb = async (uri?: string): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const connectionUri = uri ?? env.mongodbUri;
  const connection = await mongoose.connect(connectionUri);
  // Wait for the new sparse uniqueness constraints before accepting writes.
  // init creates declared indexes; it never drops existing indexes.
  await Promise.all([AdherenceLogModel.init(), NotificationModel.init()]);
  return connection;
};

/**
 * Closes the active MongoDB connection when one exists.
 */
export const disconnectDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};
