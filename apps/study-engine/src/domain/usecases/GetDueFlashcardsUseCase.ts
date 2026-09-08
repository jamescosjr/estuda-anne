import { Flashcard } from '../entities/Flashcard.js';
import { IFlashcardRepository } from '../ports/index.js';
import { interleaveByKey, subjectBucket, uniqueByExactFront } from '../services/FlashcardStudySession.js';

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

    const due = await this.flashcardRepository.findDueCards(input.studentId, targetDate, limit);
    return interleaveByKey(uniqueByExactFront(due), subjectBucket).slice(0, limit);
  }
}
