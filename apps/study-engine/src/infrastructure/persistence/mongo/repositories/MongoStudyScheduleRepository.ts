import { Collection, Db } from 'mongodb';
import { StudySchedule } from '../../../../domain/entities/StudySchedule.js';
import { IStudyScheduleRepository } from '../../../../domain/ports/IStudyScheduleRepository.js';
import { StudyScheduleMongoDocument } from '../schemas/StudyScheduleMongoDocument.js';
import { StudyScheduleMapper } from '../mappers/StudyScheduleMapper.js';

export class MongoStudyScheduleRepository implements IStudyScheduleRepository {
  private collection: Collection<StudyScheduleMongoDocument>;

  constructor(db: Db) {
    this.collection = db.collection<StudyScheduleMongoDocument>('study_schedules');
  }

  public async save(schedule: StudySchedule): Promise<void> {
    const doc = StudyScheduleMapper.toPersistence(schedule);
    await this.collection.insertOne(doc);
  }

  public async findById(id: string): Promise<StudySchedule | null> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return StudyScheduleMapper.toDomain(doc);
  }

  public async findByStudentId(studentId: string): Promise<StudySchedule | null> {
    const doc = await this.collection.findOne({ studentId });
    if (!doc) return null;
    return StudyScheduleMapper.toDomain(doc);
  }

  public async update(schedule: StudySchedule): Promise<void> {
    const doc = StudyScheduleMapper.toPersistence(schedule);
    await this.collection.replaceOne({ _id: schedule.id }, doc, { upsert: true });
  }
}
