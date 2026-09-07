import { ReviewGrade, isValidReviewGrade } from '../value-objects/index.js';
import { IFlashcardRepository } from '../ports/index.js';
import { NotFoundError } from '../errors/DomainError.js';

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
  constructor(private readonly flashcardRepository: IFlashcardRepository) {}

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
