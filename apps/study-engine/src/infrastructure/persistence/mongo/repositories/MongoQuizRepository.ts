import { Collection, Db } from 'mongodb';
import { Quiz } from '../../../../domain/entities/Quiz.js';
import { IQuizRepository } from '../../../../domain/ports/IQuizRepository.js';
import { QuizMongoDocument } from '../schemas/QuizMongoDocument.js';
import { QuizMapper } from '../mappers/QuizMapper.js';

export class MongoQuizRepository implements IQuizRepository {
  private collection: Collection<QuizMongoDocument>;

  constructor(db: Db) {
    this.collection = db.collection<QuizMongoDocument>('quizzes');
  }

  public async save(quiz: Quiz): Promise<void> {
    const doc = QuizMapper.toPersistence(quiz);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  public async findById(id: string): Promise<Quiz | null> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return QuizMapper.toDomain(doc);
  }

  public async findByMaterialId(materialId: string): Promise<Quiz[]> {
    const docs = await this.collection.find({ materialId }).toArray();
    return docs.map(QuizMapper.toDomain);
  }

  public async findByStudentId(studentId: string): Promise<Quiz[]> {
    const docs = await this.collection.find({ studentId }).toArray();
    return docs.map(QuizMapper.toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  public async deleteByStudentId(studentId: string): Promise<void> {
    if (!studentId) return;
    await this.collection.deleteMany({ studentId });
  }
}
