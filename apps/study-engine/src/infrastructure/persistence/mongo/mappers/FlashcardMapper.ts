import { Flashcard } from '../../../../domain/entities/Flashcard.js';
import { ReviewGrade } from '../../../../domain/value-objects/ReviewGrade.js';
import { FlashcardMongoDocument } from '../schemas/FlashcardMongoDocument.js';

export class FlashcardMapper {
  public static toDomain(doc: FlashcardMongoDocument): Flashcard {
    return Flashcard.reconstitute({
      id: doc._id,
      studentId: doc.studentId,
      materialId: doc.materialId,
      front: doc.front,
      back: doc.back,
      repetitionIntervalDays: doc.repetitionIntervalDays,
      easeFactor: doc.easeFactor,
      repetitionsCount: doc.repetitionsCount,
      nextReviewDate: doc.nextReviewDate,
      lastReviewedAt: doc.lastReviewedAt,
      tags: doc.tags ?? [],
      history: (doc.history ?? []).map(h => ({
        grade: h.grade as ReviewGrade,
        reviewedAt: h.reviewedAt,
        intervalDays: h.intervalDays,
        easeFactor: h.easeFactor,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public static toPersistence(entity: Flashcard): FlashcardMongoDocument {
    return {
      _id: entity.id,
      studentId: entity.studentId,
      materialId: entity.materialId,
      front: entity.front,
      back: entity.back,
      repetitionIntervalDays: entity.repetitionIntervalDays,
      easeFactor: entity.easeFactor,
      repetitionsCount: entity.repetitionsCount,
      nextReviewDate: entity.nextReviewDate,
      lastReviewedAt: entity.lastReviewedAt,
      tags: [...entity.tags],
      history: entity.history.map(h => ({ ...h })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
