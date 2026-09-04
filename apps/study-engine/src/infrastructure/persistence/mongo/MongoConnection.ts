import { MongoClient, Db } from 'mongodb';
import { env } from '../../config/env.js';

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

    this.client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
    });

    await this.client.connect();
    this.db = this.client.db();

    await this.ensureIndexes();
    return this.db;
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
      // 1. Flashcards: Índice composto para revisões pendentes por aluna e data
      await this.db.collection('flashcards').createIndex(
        { studentId: 1, nextReviewDate: 1 },
        { name: 'idx_flashcards_student_due_date' }
      );
      await this.db.collection('flashcards').createIndex(
        { materialId: 1 },
        { name: 'idx_flashcards_material' }
      );

      // 2. Materials: Índice por aluna e data de criação decrescente
      await this.db.collection('materials').createIndex(
        { studentId: 1, createdAt: -1 },
        { name: 'idx_materials_student_created' }
      );
      await this.db.collection('materials').createIndex(
        { status: 1 },
        { name: 'idx_materials_status' }
      );

      // 3. Quizzes
      await this.db.collection('quizzes').createIndex(
        { materialId: 1 },
        { name: 'idx_quizzes_material' }
      );
      await this.db.collection('quizzes').createIndex(
        { studentId: 1 },
        { name: 'idx_quizzes_student' }
      );

      // 4. Study Schedules
      await this.db.collection('study_schedules').createIndex(
        { studentId: 1 },
        { name: 'idx_schedules_student' }
      );
    } catch {
      // Continua se índices já existirem ou ambiente de teste
    }
  }
}
