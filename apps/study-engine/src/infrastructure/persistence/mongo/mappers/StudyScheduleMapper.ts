import { StudySchedule } from '../../../../domain/entities/StudySchedule.js';
import { StudyScheduleMongoDocument } from '../schemas/StudyScheduleMongoDocument.js';

export class StudyScheduleMapper {
  public static toDomain(doc: StudyScheduleMongoDocument): StudySchedule {
    return StudySchedule.reconstitute({
      id: doc._id,
      studentId: doc.studentId,
      title: doc.title,
      targetExamDate: doc.targetExamDate,
      items: doc.items.map(i => ({
        id: i.id,
        date: i.date,
        dailyTargetMinutes: i.dailyTargetMinutes,
        subject: i.subject,
        topic: i.topic,
        materialIds: [...i.materialIds],
        flashcardIds: [...i.flashcardIds],
        quizIds: [...i.quizIds],
        completed: i.completed,
        completedAt: i.completedAt,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public static toPersistence(entity: StudySchedule): StudyScheduleMongoDocument {
    return {
      _id: entity.id,
      studentId: entity.studentId,
      title: entity.title,
      targetExamDate: entity.targetExamDate,
      items: entity.items.map(i => ({
        id: i.id,
        date: i.date,
        dailyTargetMinutes: i.dailyTargetMinutes,
        subject: i.subject,
        topic: i.topic,
        materialIds: [...i.materialIds],
        flashcardIds: [...i.flashcardIds],
        quizIds: [...i.quizIds],
        completed: i.completed,
        completedAt: i.completedAt,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
