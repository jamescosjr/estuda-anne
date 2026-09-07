import { Flashcard } from '../../entities/Flashcard.js';
import { IFlashcardRepository } from '../../ports/IFlashcardRepository.js';
import { ILanguageModelService, ContextCacheHandle } from '../../ports/ILanguageModelService.js';
import {
  isDocumentMetaReferencing,
  isDuplicateOrHighlySimilar,
} from '../StudyCorpusSanitizer.js';

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
    cacheHandle?: ContextCacheHandle | null
  ): Promise<Flashcard[]> {
    const existingCards = (await this.flashcardRepository.findByMaterialId(materialId)) || [];
    const existingFronts = existingCards.map(c => c.front);

    const generatedCards = await this.aiService.generateFlashcards(
      rawText,
      5,
      existingFronts,
      focusTopics,
      { cacheHandle }
    );

    const accumulatedFronts: string[] = [...existingFronts];
    const cleanUniqueCards = generatedCards.filter((c) => {
      // 1. Rejeita cartões com referências a metadados, PDF, arquivos ou itens do documento
      if (isDocumentMetaReferencing(c.front) || isDocumentMetaReferencing(c.back)) {
        return false;
      }

      // 2. Rejeita cartões duplicados ou semanticamente repetidos (> 60% Jaccard similarity)
      if (isDuplicateOrHighlySimilar(c.front, accumulatedFronts, 0.60)) {
        return false;
      }

      accumulatedFronts.push(c.front.trim());
      return true;
    });

    const flashcards = cleanUniqueCards.map((c) =>
      Flashcard.create({
        studentId,
        materialId,
        front: c.front,
        back: c.back,
        tags: [...keyConcepts.slice(0, 3)],
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
