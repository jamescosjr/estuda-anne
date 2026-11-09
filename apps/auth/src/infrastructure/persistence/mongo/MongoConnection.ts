import { MongoClient, Db } from 'mongodb';
import { env } from '../../config/env.js';

function databaseNameFromUri(uri: string): string {
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, '').split('?')[0];
    return pathname || 'estuda-anne';
  } catch {
    return 'estuda-anne';
  }
}

export class MongoConnection {
  private static instance: MongoConnection | null = null;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  public async connect(uri: string = env.MONGODB_URI): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });

    try {
      await client.connect();
      this.client = client;
      this.db = client.db(databaseNameFromUri(uri));
      await this.ensureIndexes();
      return this.db;
    } catch (error) {
      await client.close().catch(() => undefined);
      this.client = null;
      this.db = null;
      throw error;
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Índice único no e-mail do usuário
      await this.db.collection('users').createIndex(
        { email: 1 },
        { unique: true, name: 'idx_users_email_unique' }
      );
      // Índice por role
      await this.db.collection('users').createIndex(
        { role: 1 },
        { name: 'idx_users_role' }
      );
    } catch {
      // Ignora erro se índice já existir
    }
  }
}
