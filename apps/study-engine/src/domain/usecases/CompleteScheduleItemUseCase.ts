import { IStudyScheduleRepository } from '../ports/index.js';
import { StudySchedule } from '../entities/StudySchedule.js';

export interface CompleteScheduleItemInput {
  studentId: string;
  itemId: string;
}

export class CompleteScheduleItemUseCase {
  constructor(private readonly scheduleRepository: IStudyScheduleRepository) {}

  public async execute(input: CompleteScheduleItemInput): Promise<StudySchedule> {
    const schedule = await this.scheduleRepository.findByStudentId(input.studentId);
    if (!schedule) {
      throw new Error(`Study schedule not found for student ${input.studentId}`);
    }

    schedule.markItemCompleted(input.itemId);
    await this.scheduleRepository.update(schedule);
    return schedule;
  }
}
