import { Db } from 'mongodb';
import {
  IMetricsRepository,
  ScheduleRaw,
  FlashcardRaw,
  MaterialRaw,
} from '../../../../domain/ports/IMetricsRepository.js';

export class MongoMetricsRepository implements IMetricsRepository {
  constructor(private readonly db: Db) {}

  async getSchedulesByStudentId(studentId: string): Promise<ScheduleRaw[]> {
    const collection = this.db.collection('study_schedules');
    const docs = await collection.find({ studentId }).toArray();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      studentId: doc.studentId,
      title: doc.title,
      items: (doc.items || []).map((item: any) => ({
        id: item.id,
        date: new Date(item.date),
        dailyTargetMinutes: item.dailyTargetMinutes,
        subject: item.subject,
        topic: item.topic,
        materialIds: item.materialIds || [],
        flashcardIds: item.flashcardIds || [],
        quizIds: item.quizIds || [],
        completed: Boolean(item.completed),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      })),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
  }

  async getFlashcardsByStudentId(studentId: string): Promise<FlashcardRaw[]> {
    const collection = this.db.collection('flashcards');
    const docs = await collection.find({ studentId }).toArray();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      studentId: doc.studentId,
      materialId: doc.materialId,
      front: doc.front || '',
      back: doc.back || '',
      nextReviewDate: doc.nextReviewDate ? new Date(doc.nextReviewDate) : new Date(0),
      lastReviewedAt: doc.lastReviewedAt ? new Date(doc.lastReviewedAt) : undefined,
      repetitionIntervalDays: doc.repetitionIntervalDays,
      easeFactor: doc.easeFactor,
      repetitionsCount: doc.repetitionsCount,
      history: (doc.history || []).map((h: any) => ({
        grade: Number(h.grade || 0),
        reviewedAt: new Date(h.reviewedAt),
      })),
    }));
  }

  async getMaterialsByStudentId(studentId: string): Promise<MaterialRaw[]> {
    const collection = this.db.collection('materials');
    const docs = await collection.find({ studentId }).toArray();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      studentId: doc.studentId,
      title: doc.title || '',
      subject: doc.subject,
    }));
  }
}
