import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { inTransaction } from '../utils/transaction';

it('fails closed on standalone MongoDB without performing any partial write', async () => {
  const server = await MongoMemoryServer.create({ binary: { downloadDir: resolve(__dirname, '../../node_modules/.cache/mongodb-binaries') } });
  try {
    await mongoose.connect(server.getUri());
    const collection = mongoose.connection.db!.collection('synthetic_transaction_test');
    await collection.insertOne({ stock: 10 });
    await expect(inTransaction(async (session) => {
      await collection.updateOne({}, { $inc: { stock: -2 } }, { session });
    })).rejects.toMatchObject({ code: 'TRANSACTIONS_REQUIRED', statusCode: 503 });
    expect((await collection.findOne({}))?.stock).toBe(10);
  } finally {
    await mongoose.disconnect();
    await server.stop();
  }
});
