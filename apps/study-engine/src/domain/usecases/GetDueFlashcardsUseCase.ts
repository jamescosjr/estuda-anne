import { Flashcard } from '../entities/Flashcard.js';
import { IFlashcardRepository, IMaterialRepository } from '../ports/index.js';
import {
  cardMatchesSubject,
  interleaveByKey,
  subjectBucket,
  uniqueByExactFront,
} from '../services/FlashcardStudySession.js';
import { isGenericPlaceholderPrompt } from '../services/StudyCorpusSanitizer.js';

export interface GetDueFlashcardsInput {
  studentId: string;
  asOfDate?: Date;
  limit?: number;
  topic?: string;
  allowedSubjects?: string[];
}

export interface GetDueFlashcardsOutput {
  cards: Flashcard[];
  subjectByMaterialId: Record<string, string>;
}

export class GetDueFlashcardsUseCase {
  constructor(
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly materialRepository?: IMaterialRepository
  ) {}

  public async execute(input: GetDueFlashcardsInput): Promise<GetDueFlashcardsOutput> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('studentId is required to fetch due flashcards');
    }

    const targetDate = input.asOfDate ?? new Date();
    const limit = input.limit && input.limit > 0 ? input.limit : 50;
    const materials = this.materialRepository
      ? await this.materialRepository.findByStudentId(input.studentId)
      : [];
    const materialById = new Map(materials.map((material) => [material.id, material]));
    const subjectByMaterialId: Record<string, string> = {};
    for (const material of materials) {
      subjectByMaterialId[material.id] = material.subject || material.title;
    }

    const matchesTopic = (card: Flashcard) =>
      cardMatchesSubject(card, materialById.get(card.materialId), input.topic, input.allowedSubjects);

    const due = await this.flashcardRepository.findDueCards(input.studentId, targetDate, limit);
    const usableDue = uniqueByExactFront(due)
      .filter((card) => !isGenericPlaceholderPrompt(card.front))
      .filter(matchesTopic);

    if (usableDue.length >= limit) {
      return {
        cards: interleaveByKey(usableDue, subjectBucket).slice(0, limit),
        subjectByMaterialId,
      };
    }

    const bank = await this.flashcardRepository.findByStudentId(input.studentId, 200);
    const dueIds = new Set(usableDue.map((card) => card.id));
    const fill = uniqueByExactFront(bank).filter(
      (card) =>
        !dueIds.has(card.id) &&
        !isGenericPlaceholderPrompt(card.front) &&
        matchesTopic(card)
    );

    return {
      cards: interleaveByKey([...usableDue, ...fill], subjectBucket).slice(0, limit),
      subjectByMaterialId,
    };
  }
}
