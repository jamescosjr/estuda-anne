import { describe, it, expect, vi, beforeEach } from 'vitest';

const mongoClientInstances: Array<{ uri: string; options: Record<string, unknown> }> = [];
const connectMock = vi.fn().mockResolvedValue(undefined);
const closeMock = vi.fn().mockResolvedValue(undefined);
const createIndexMock = vi.fn().mockResolvedValue('ok');
const dbMock = {
  collection: vi.fn().mockReturnValue({
    createIndex: createIndexMock,
  }),
};

vi.mock('mongodb', () => {
  class MockMongoClient {
    public uri: string;
    public options: Record<string, unknown>;

    constructor(uri: string, options: Record<string, unknown>) {
      this.uri = uri;
      this.options = options;
      mongoClientInstances.push({ uri, options });
    }

    public connect = connectMock;
    public close = closeMock;
    public db = vi.fn().mockReturnValue(dbMock);
  }

  return {
    MongoClient: MockMongoClient,
  };
});

import { MongoConnection } from '../../src/infrastructure/persistence/mongo/MongoConnection.js';

describe('MongoConnection - Pool Resilience & Timeouts', () => {
  beforeEach(async () => {
    mongoClientInstances.length = 0;
    connectMock.mockClear();
    closeMock.mockClear();
    createIndexMock.mockClear();
    await MongoConnection.getInstance().disconnect();
  });

  it('REQ_03_WHEN_mongo_connection_conectar_SHALL_configurar_maxIdleTimeMS_socketTimeoutMS_e_connectTimeoutMS', async () => {
    const conn = MongoConnection.getInstance();
    await conn.connect('mongodb://localhost:27017/estuda-anne-test');

    expect(mongoClientInstances).toHaveLength(1);
    expect(mongoClientInstances[0].uri).toBe('mongodb://localhost:27017/estuda-anne-test');
    expect(mongoClientInstances[0].options).toEqual({
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });
    expect(connectMock).toHaveBeenCalledOnce();
  });
});
