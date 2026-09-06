import { Collection, Db } from 'mongodb';
import { Flashcard } from '../../../../domain/entities/Flashcard.js';
import { IFlashcardRepository } from '../../../../domain/ports/IFlashcardRepository.js';
import { FlashcardMongoDocument } from '../schemas/FlashcardMongoDocument.js';
import { FlashcardMapper } from '../mappers/FlashcardMapper.js';

export class MongoFlashcardRepository implements IFlashcardRepository {
  private collection: Collection<FlashcardMongoDocument>;

  constructor(db: Db) {
    this.collection = db.collection<FlashcardMongoDocument>('flashcards');
  }

  public async save(flashcard: Flashcard): Promise<void> {
    const doc = FlashcardMapper.toPersistence(flashcard);
    await this.collection.insertOne(doc);
  }

  public async saveMany(flashcards: Flashcard[]): Promise<void> {
    if (flashcards.length === 0) return;
    const docs = flashcards.map(FlashcardMapper.toPersistence);
    await this.collection.insertMany(docs);
  }

  public async findById(id: string): Promise<Flashcard | null> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return FlashcardMapper.toDomain(doc);
  }

  public async findByStudentId(studentId: string, limit = 200): Promise<Flashcard[]> {
    const docs = await this.collection.find({ studentId }).limit(limit).toArray();
    return docs.map(FlashcardMapper.toDomain);
  }

  public async findDueCards(studentId: string, asOfDate: Date, limit = 50): Promise<Flashcard[]> {
    const docs = await this.collection
      .find({
        studentId,
        nextReviewDate: { $lte: asOfDate },
      })
      .sort({ nextReviewDate: 1 })
      .limit(limit)
      .toArray();

    return docs.map(FlashcardMapper.toDomain);
  }

  public async findByMaterialId(materialId: string): Promise<Flashcard[]> {
    const docs = await this.collection.find({ materialId }).toArray();
    return docs.map(FlashcardMapper.toDomain);
  }

  public async update(flashcard: Flashcard): Promise<void> {
    const doc = FlashcardMapper.toPersistence(flashcard);
    await this.collection.replaceOne({ _id: flashcard.id }, doc, { upsert: true });
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  public async deleteByStudentId(studentId: string): Promise<void> {
    if (!studentId) return;
    await this.collection.deleteMany({ studentId });
  }
}
