import mongoose from 'mongoose';

import { env } from './env';

/**
 * Connects the backend to MongoDB.
 */
export const connectDb = async (uri?: string): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const connectionUri = uri ?? env.mongodbUri;
  return mongoose.connect(connectionUri);
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
