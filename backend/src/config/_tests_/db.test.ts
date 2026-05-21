import mongoose from 'mongoose';

import { connectDb, disconnectDb } from '../db';

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    connection: {
      readyState: 0,
    },
  },
}));

const mockedMongoose = mongoose as unknown as {
  connect: jest.Mock;
  disconnect: jest.Mock;
  connection: {
    readyState: number;
  };
};

describe('database configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedMongoose.connection.readyState = 0;
  });

  it('connects using the provided URI when not already connected', async () => {
    await connectDb('mongodb://localhost:27017/blister-test');

    expect(mockedMongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/blister-test');
  });

  it('skips a new connection when mongoose is already connected', async () => {
    mockedMongoose.connection.readyState = 1;

    await connectDb('mongodb://localhost:27017/blister-test');

    expect(mockedMongoose.connect).not.toHaveBeenCalled();
  });

  it('disconnects only when there is an active connection', async () => {
    mockedMongoose.connection.readyState = 1;

    await disconnectDb();

    expect(mockedMongoose.disconnect).toHaveBeenCalledTimes(1);
  });
});
