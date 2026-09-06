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

  /**
   * Índices MongoDB estratégicos para baixo custo e escalabilidade:
   * Evita scans de coleção inteira e mantém a memória RAM baixa.
   */
  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.collection('flashcards').createIndex(
        { studentId: 1, nextReviewDate: 1 },
        { name: 'idx_flashcards_student_due_date' }
      );
      await this.db.collection('flashcards').createIndex(
        { materialId: 1 },
        { name: 'idx_flashcards_material' }
      );

      await this.db.collection('materials').createIndex(
        { studentId: 1, createdAt: -1 },
        { name: 'idx_materials_student_created' }
      );
      await this.db.collection('materials').createIndex(
        { status: 1 },
        { name: 'idx_materials_status' }
      );

      await this.db.collection('quizzes').createIndex(
        { materialId: 1 },
        { name: 'idx_quizzes_material' }
      );
      await this.db.collection('quizzes').createIndex(
        { studentId: 1 },
        { name: 'idx_quizzes_student' }
      );

      await this.db.collection('study_schedules').createIndex(
        { studentId: 1 },
        { name: 'idx_schedules_active_student', unique: true }
      );

      await this.db.collection('material_embeddings').createIndex(
        { materialId: 1 },
        { name: 'idx_embeddings_material' }
      );
      await this.db.collection('material_embeddings').createIndex(
        { studentId: 1 },
        { name: 'idx_embeddings_student' }
      );
    } catch {
      // Continua se índices já existirem ou ambiente de teste
    }
  }
}
