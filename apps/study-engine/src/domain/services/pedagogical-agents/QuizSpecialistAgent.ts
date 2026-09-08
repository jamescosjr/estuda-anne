import { Quiz } from '../../entities/Quiz.js';
import { IQuizRepository } from '../../ports/IQuizRepository.js';
import { ILanguageModelService, ContextCacheHandle } from '../../ports/ILanguageModelService.js';
import {
  isDocumentMetaReferencing,
  isDuplicateOrHighlySimilar,
  isPedagogicallyOffTopic,
} from '../StudyCorpusSanitizer.js';
import { GENERATION_SIMILARITY_THRESHOLD } from '../FlashcardStudySession.js';

export class QuizSpecialistAgent {
  constructor(
    private readonly aiService: ILanguageModelService,
    private readonly quizRepository: IQuizRepository
  ) {}

  public async generateQuiz(
    materialId: string,
    studentId: string,
    materialTitle: string,
    rawText: string,
    focusTopics?: Array<{ topic: string; priorityWeight: number }>,
    persist = true,
    cacheHandle?: ContextCacheHandle | null,
    count = 4
  ): Promise<Quiz | null> {
    const existingMaterialQuizzes = (await this.quizRepository.findByMaterialId(materialId)) || [];
    const studentQuizzes = (await this.quizRepository.findByStudentId?.(studentId)) || [];
    const existingPrompts = Array.from(
      new Set([
        ...existingMaterialQuizzes.flatMap(q => q.questions.map(item => item.prompt)),
        ...studentQuizzes.flatMap(q => q.questions.map(item => item.prompt)),
      ])
    );

    let quizQuestions = await this.aiService.generateQuizQuestions(
      rawText,
      Math.max(3, count),
      existingPrompts,
      focusTopics,
      { cacheHandle }
    );

    if (!quizQuestions || quizQuestions.length === 0) return null;

    const accumulatedPrompts = [...existingPrompts];
    quizQuestions = quizQuestions.filter(q => {
      if (!q || !q.prompt) return false;
      if (isDocumentMetaReferencing(q.prompt)) return false;
      if (isPedagogicallyOffTopic(q.prompt)) return false;
      if (isDuplicateOrHighlySimilar(q.prompt, accumulatedPrompts, GENERATION_SIMILARITY_THRESHOLD)) return false;

      accumulatedPrompts.push(q.prompt.trim());
      return true;
    });

    if (quizQuestions.length === 0) return null;

    const quiz = Quiz.create({
      studentId,
      materialId,
      title: `Quiz: ${materialTitle}`,
      questions: quizQuestions,
    });

    if (persist) {
      await this.quizRepository.save(quiz);
    }
    return quiz;
  }

  public async persistQuiz(quiz: Quiz | null): Promise<void> {
    if (quiz) {
      await this.quizRepository.save(quiz);
    }
  }
}
