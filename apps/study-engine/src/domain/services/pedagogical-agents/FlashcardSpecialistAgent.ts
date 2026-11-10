import { Flashcard } from '../../entities/Flashcard.js';
import { IFlashcardRepository } from '../../ports/IFlashcardRepository.js';
import { ILanguageModelService, ContextCacheHandle } from '../../ports/ILanguageModelService.js';
import {
  isDocumentMetaReferencing,
  isDuplicateOrHighlySimilar,
  isPedagogicallyOffTopic,
  isGroundedInCorpus,
} from '../StudyCorpusSanitizer.js';
import { GENERATION_SIMILARITY_THRESHOLD } from '../FlashcardStudySession.js';

export class FlashcardSpecialistAgent {
  constructor(
    private readonly aiService: ILanguageModelService,
    private readonly flashcardRepository: IFlashcardRepository
  ) {}

  public async generateFlashcards(
    materialId: string,
    studentId: string,
    rawText: string,
    keyConcepts: readonly string[],
    focusTopics?: Array<{ topic: string; priorityWeight: number }>,
    persist = true,
    cacheHandle?: ContextCacheHandle | null,
    count = 8,
    subjectTag?: string
  ): Promise<Flashcard[]> {
    const existingMaterialCards = (await this.flashcardRepository.findByMaterialId(materialId)) || [];
    const studentCards = (await this.flashcardRepository.findByStudentId?.(studentId, 100)) || [];
    const existingFronts = Array.from(
      new Set([
        ...existingMaterialCards.map(c => c.front),
        ...studentCards.map(c => c.front),
      ])
    );

    const groundedKeyConcepts = keyConcepts.filter(
      (concept) =>
        concept &&
        !isDocumentMetaReferencing(concept) &&
        !isPedagogicallyOffTopic(concept)
    );

    const targetCount = Math.max(3, count);
    let generatedCards = await this.aiService.generateFlashcards(
      rawText,
      targetCount,
      existingFronts,
      focusTopics,
      { cacheHandle, keyConcepts: groundedKeyConcepts }
    );

    const filterBatch = (batch: typeof generatedCards, accumulatedFronts: string[]) =>
      batch.filter((c) => {
        if (!c || !c.front || !c.back) return false;
        if (isDocumentMetaReferencing(c.front) || isDocumentMetaReferencing(c.back)) {
          return false;
        }
        if (isPedagogicallyOffTopic(c.front) || isPedagogicallyOffTopic(c.back)) {
          return false;
        }
        if (!isGroundedInCorpus(`${c.front} ${c.back}`, rawText, groundedKeyConcepts)) {
          return false;
        }
        if (isDuplicateOrHighlySimilar(c.front, accumulatedFronts, GENERATION_SIMILARITY_THRESHOLD)) {
          return false;
        }
        accumulatedFronts.push(c.front.trim());
        return true;
      });

    const accumulatedFronts: string[] = [...existingFronts];
    let cleanUniqueCards = filterBatch(generatedCards, accumulatedFronts);

    if (cleanUniqueCards.length < Math.min(4, targetCount)) {
      const retry = await this.aiService.generateFlashcards(
        rawText,
        targetCount,
        accumulatedFronts,
        focusTopics,
        { cacheHandle, keyConcepts: groundedKeyConcepts }
      );
      cleanUniqueCards = [...cleanUniqueCards, ...filterBatch(retry, accumulatedFronts)];
    }

    const tags = Array.from(
      new Set([subjectTag, ...groundedKeyConcepts].filter((item): item is string => Boolean(item)))
    ).slice(0, 3);

    const flashcards = cleanUniqueCards.map((c) =>
      Flashcard.create({
        studentId,
        materialId,
        front: c.front,
        back: c.back,
        tags,
      })
    );

    if (persist && flashcards.length > 0) {
      await this.flashcardRepository.saveMany(flashcards);
    }

    return flashcards;
  }

  public async persistFlashcards(flashcards: Flashcard[]): Promise<void> {
    if (flashcards.length > 0) {
      await this.flashcardRepository.saveMany(flashcards);
    }
  }
}
