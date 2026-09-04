import { Quiz } from '../../../../domain/entities/Quiz.js';
import { QuizMongoDocument } from '../schemas/QuizMongoDocument.js';

export class QuizMapper {
  public static toDomain(doc: QuizMongoDocument): Quiz {
    return Quiz.reconstitute({
      id: doc._id,
      studentId: doc.studentId,
      materialId: doc.materialId,
      title: doc.title,
      questions: doc.questions.map(q => ({
        id: q.id,
        prompt: q.prompt,
        options: [...q.options],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public static toPersistence(entity: Quiz): QuizMongoDocument {
    return {
      _id: entity.id,
      studentId: entity.studentId,
      materialId: entity.materialId,
      title: entity.title,
      questions: entity.questions.map(q => ({
        id: q.id,
        prompt: q.prompt,
        options: [...q.options],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
