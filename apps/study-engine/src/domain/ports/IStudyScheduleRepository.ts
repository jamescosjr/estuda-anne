import { StudySchedule } from '../entities/StudySchedule.js';

export interface IStudyScheduleRepository {
  save(schedule: StudySchedule): Promise<void>;
  findById(id: string): Promise<StudySchedule | null>;
  findByStudentId(studentId: string): Promise<StudySchedule | null>;
  update(schedule: StudySchedule): Promise<void>;
}
