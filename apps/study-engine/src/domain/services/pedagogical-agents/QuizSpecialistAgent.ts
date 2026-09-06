import { Quiz } from '../../entities/Quiz.js';
import { IQuizRepository } from '../../ports/IQuizRepository.js';
import { ILanguageModelService } from '../../ports/ILanguageModelService.js';

export class QuizSpecialistAgent {
  constructor(
    private readonly aiService: ILanguageModelService,
    private readonly quizRepository: IQuizRepository
  ) {}

  public async generateQuiz(
    materialId: string,
    studentId: string,
    materialTitle: string,
    rawText: string
  ): Promise<Quiz | null> {
    let quizQuestions = await this.aiService.generateQuizQuestions(rawText, 4);

    if (!quizQuestions || quizQuestions.length === 0) return null;

    // Deduplicação estrita de questões
    const seenPrompts = new Set<string>();
    quizQuestions = quizQuestions.filter(q => {
      const norm = q.prompt.trim().toLowerCase();
      if (seenPrompts.has(norm)) return false;
      seenPrompts.add(norm);
      return true;
    });

    if (quizQuestions.length === 0) return null;

    const quiz = Quiz.create({
      studentId,
      materialId,
      title: `Quiz: ${materialTitle}`,
      questions: quizQuestions,
    });

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
