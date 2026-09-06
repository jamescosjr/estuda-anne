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
    rawText: string,
    focusTopics?: Array<{ topic: string; priorityWeight: number }>
  ): Promise<Quiz | null> {
    const existingQuizzes = (await this.quizRepository.findByMaterialId(materialId)) || [];
    const existingPrompts = existingQuizzes.flatMap(q => q.questions.map(item => item.prompt));

    let quizQuestions = await this.aiService.generateQuizQuestions(
      rawText,
      4,
      existingPrompts,
      focusTopics
    );

    if (!quizQuestions || quizQuestions.length === 0) return null;

    // Deduplicação estrita contra banco e no próprio lote
    const seenPrompts = new Set(existingPrompts.map(p => p.trim().toLowerCase()));
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
