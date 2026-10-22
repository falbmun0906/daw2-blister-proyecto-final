import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { resolve } from 'node:path';

let mongoServer: MongoMemoryReplSet | null = null;

export const connectTestDatabase = async (): Promise<void> => {
  mongoServer = await MongoMemoryReplSet.create({
    binary: { downloadDir: resolve(__dirname, '../../../../node_modules/.cache/mongodb-binaries') },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(mongoServer.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

export const clearTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;
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
