import { IStudyScheduleRepository } from '../ports/IStudyScheduleRepository.js';
import { StudySchedule } from '../entities/StudySchedule.js';

export interface AutoCompleteScheduleItemsInput {
  studentId: string;
  subject?: string;
  topic?: string;
  quizId?: string;
  flashcardId?: string;
  itemId?: string;
}

export interface AutoCompleteScheduleItemsOutput {
  completedCount: number;
  updatedSchedule?: StudySchedule;
}

export class AutoCompleteScheduleItemsUseCase {
  constructor(private readonly scheduleRepository: IStudyScheduleRepository) {}

  public async execute(input: AutoCompleteScheduleItemsInput): Promise<AutoCompleteScheduleItemsOutput> {
    if (!input.studentId) {
      return { completedCount: 0 };
    }

    const schedule = await this.scheduleRepository.findByStudentId(input.studentId);
    if (!schedule) {
      return { completedCount: 0 };
    }

    let count = 0;
    const now = new Date();

    for (const item of schedule.items) {
      if (item.completed) continue;

      let matches = false;

      if (input.itemId && item.id === input.itemId) {
        matches = true;
      } else if (input.quizId && item.quizIds?.includes(input.quizId)) {
        matches = true;
      } else if (input.flashcardId && item.flashcardIds?.includes(input.flashcardId)) {
        matches = true;
      } else if (
        input.subject &&
        item.subject &&
        input.subject.toLowerCase().trim() === item.subject.toLowerCase().trim()
      ) {
        if (
          !input.topic ||
          !item.topic ||
          input.topic.toLowerCase().trim() === item.topic.toLowerCase().trim() ||
          item.topic.toLowerCase().includes(input.topic.toLowerCase())
        ) {
          matches = true;
        }
      }

      if (matches) {
        item.completed = true;
        item.completedAt = now;
        count += 1;
      }
    }

    if (count > 0) {
      await this.scheduleRepository.save(schedule);
    }

    return {
      completedCount: count,
      updatedSchedule: schedule,
    };
  }
}
