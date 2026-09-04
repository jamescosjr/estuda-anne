import { Flashcard } from '../entities/Flashcard.js';
import { IFlashcardRepository } from '../ports/index.js';

export interface GetDueFlashcardsInput {
  studentId: string;
  asOfDate?: Date;
  limit?: number;
}

export class GetDueFlashcardsUseCase {
  constructor(private readonly flashcardRepository: IFlashcardRepository) {}

  public async execute(input: GetDueFlashcardsInput): Promise<Flashcard[]> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('studentId is required to fetch due flashcards');
    }

    const targetDate = input.asOfDate ?? new Date();
    const limit = input.limit && input.limit > 0 ? input.limit : 50;

    return this.flashcardRepository.findDueCards(input.studentId, targetDate, limit);
  }
}
