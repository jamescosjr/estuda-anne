import { Flashcard } from '../../entities/Flashcard.js';
import { IFlashcardRepository } from '../../ports/IFlashcardRepository.js';
import { ILanguageModelService } from '../../ports/ILanguageModelService.js';

export class FlashcardSpecialistAgent {
  constructor(
    private readonly aiService: ILanguageModelService,
    private readonly flashcardRepository: IFlashcardRepository
  ) {}

  public async generateFlashcards(
    materialId: string,
    studentId: string,
    rawText: string,
    keyConcepts: readonly string[]
  ): Promise<Flashcard[]> {
    const generatedCards = await this.aiService.generateFlashcards(rawText, 5);

    const seenFronts = new Set<string>();
    const uniqueCards = generatedCards.filter((c) => {
      const norm = c.front.trim().toLowerCase();
      if (seenFronts.has(norm)) return false;
      seenFronts.add(norm);
      return true;
    });

    const flashcards = uniqueCards.map((c) =>
      Flashcard.create({
        studentId,
        materialId,
        front: c.front,
        back: c.back,
        tags: [...keyConcepts.slice(0, 3)],
      })
    );

    if (flashcards.length > 0) {
      await this.flashcardRepository.saveMany(flashcards);
    }

    return flashcards;
  }
}
