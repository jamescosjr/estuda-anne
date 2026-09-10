import { ReviewGrade, isValidReviewGrade } from '../value-objects/index.js';
import { IFlashcardRepository, IStudyScheduleRepository } from '../ports/index.js';
import { NotFoundError } from '../errors/DomainError.js';
import { IStudentAdaptiveProfileRepository } from './EvaluateQuizUseCase.js';
import { StudentAdaptiveProfile } from '../entities/StudentAdaptiveProfile.js';

export interface ReviewFlashcardInput {
  flashcardId: string;
  grade: number;
}

export interface ReviewFlashcardOutput {
  flashcardId: string;
  repetitionIntervalDays: number;
  easeFactor: number;
  repetitionsCount: number;
  nextReviewDate: Date;
  lastReviewedAt: Date;
}

export class ReviewFlashcardUseCase {
  constructor(
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly profileRepository?: IStudentAdaptiveProfileRepository,
    private readonly scheduleRepository?: IStudyScheduleRepository
  ) {}

  public async execute(input: ReviewFlashcardInput): Promise<ReviewFlashcardOutput> {
    if (!isValidReviewGrade(input.grade)) {
      throw new Error(`Invalid review grade: ${input.grade}. Must be an integer between 0 and 5.`);
    }

    const flashcard = await this.flashcardRepository.findById(input.flashcardId);
    if (!flashcard) {
      throw new NotFoundError(`Flashcard with ID ${input.flashcardId} not found`);
    }

    flashcard.applyReview(input.grade as ReviewGrade);
    await this.flashcardRepository.update(flashcard);

    if (this.profileRepository) {
      const topic = flashcard.tags[0] || 'Geral';
      const profile =
        (await this.profileRepository.findByStudentId(flashcard.studentId)) ||
        StudentAdaptiveProfile.createDefault(flashcard.studentId);
      const updated = profile.recordQuizResult([
        { topic, isCorrect: input.grade >= 3 },
      ]);
      await this.profileRepository.save(updated);
    }

    if (this.scheduleRepository) {
      try {
        const schedule = await this.scheduleRepository.findByStudentId(flashcard.studentId);
        if (schedule) {
          let updated = false;
          const now = new Date();
          for (const item of schedule.items) {
            if (!item.completed && (item.flashcardIds?.includes(flashcard.id) || item.flashcardIds?.length)) {
              item.completed = true;
              item.completedAt = now;
              updated = true;
            }
          }
          if (updated) {
            await this.scheduleRepository.save(schedule);
          }
        }
      } catch {
        // Ignora erro resiliente
      }
    }

    return {
      flashcardId: flashcard.id,
      repetitionIntervalDays: flashcard.repetitionIntervalDays,
      easeFactor: flashcard.easeFactor,
      repetitionsCount: flashcard.repetitionsCount,
      nextReviewDate: flashcard.nextReviewDate,
      lastReviewedAt: flashcard.lastReviewedAt!,
    };
  }
}
