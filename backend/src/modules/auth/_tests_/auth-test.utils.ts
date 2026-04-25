import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | null = null;

export const connectTestDatabase = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

export const clearTestDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map(async (collection) => {
      await collection.deleteMany({});
    }),
  );
};

export const disconnectTestDatabase = async (): Promise<void> => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
};
