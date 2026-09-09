import { Flashcard } from '../entities/Flashcard.js';
import { Quiz } from '../entities/Quiz.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
} from '../ports/index.js';
import { IStudentAdaptiveProfileRepository } from './EvaluateQuizUseCase.js';
import { FlashcardSpecialistAgent } from '../services/pedagogical-agents/FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from '../services/pedagogical-agents/QuizSpecialistAgent.js';
import { cardMatchesSubject, composeAdaptiveSession, materialMatchesTopic } from '../services/FlashcardStudySession.js';
import { materialHasStudyCorpus } from '../services/StudyCorpusSanitizer.js';
import { UnprocessableError } from '../errors/DomainError.js';
import {
  composeQuizSession,
  flattenQuizzes,
  questionMatchesTopic,
  QuizBankItem,
} from '../services/QuizStudySession.js';

export interface GenerateExtraSessionInput {
  studentId: string;
  materialId?: string;
  topic?: string;
  allowedSubjects?: string[];
  count?: number;
  excludeIds?: string[];
  targetType?: 'flashcards' | 'quiz' | 'both';
}

export interface GenerateExtraSessionOutput {
  studentId: string;
  generatedFlashcardsCount: number;
  generatedQuizId?: string;
  flashcards: Flashcard[];
  quiz?: Quiz | null;
  weakTopics: string[];
  mixedDueCount: number;
  adaptiveHint: string;
  newCardIds: string[];
  sessionQuestions: QuizBankItem[];
  mixedBankCount: number;
  newQuestionIds: string[];
}

export class GenerateExtraSessionUseCase {
  private readonly flashcardAgent: FlashcardSpecialistAgent;
  private readonly quizAgent: QuizSpecialistAgent;

  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly aiService: ILanguageModelService,
    private readonly profileRepository?: IStudentAdaptiveProfileRepository
  ) {
    this.flashcardAgent = new FlashcardSpecialistAgent(this.aiService, this.flashcardRepository);
    this.quizAgent = new QuizSpecialistAgent(this.aiService, this.quizRepository);
  }

  public async execute(input: GenerateExtraSessionInput): Promise<GenerateExtraSessionOutput> {
    const { studentId, materialId, topic, allowedSubjects, targetType = 'both' } = input;
    const count = Math.min(20, Math.max(5, input.count ?? 8));

    let targetMaterials = [];
    if (materialId) {
      const mat = await this.materialRepository.findById(materialId);
      if (mat) targetMaterials.push(mat);
    } else {
      targetMaterials = (await this.materialRepository.findByStudentId(studentId)) || [];
    }

    const matching = targetMaterials.filter((material) => materialMatchesTopic(material, topic, allowedSubjects));
    const selected = matching
      .filter((material) => materialMatchesTopic(material, undefined, allowedSubjects))
      .filter((material) => materialHasStudyCorpus(material.rawContent, material.summary));

    if (targetMaterials.length === 0) {
      throw new UnprocessableError('Nenhum material cadastrado encontrado para gerar a sessão extra de estudos.');
    }

    let focusTopics: Array<{ topic: string; priorityWeight: number }> = [];
    let weakTopics: string[] = [];
    let adaptiveHint = 'Distribuição uniforme entre os conceitos do material.';

    if (this.profileRepository) {
      const profile = await this.profileRepository.findByStudentId(studentId);
      if (profile && profile.topicWeights) {
        focusTopics = Object.entries(profile.topicWeights)
          .map(([topicName, detail]) => ({
            topic: topicName,
            priorityWeight: detail.priorityWeight,
          }))
          .sort((a, b) => b.priorityWeight - a.priorityWeight);
        weakTopics = focusTopics.filter((t) => t.priorityWeight > 1.5).map((t) => t.topic);
        adaptiveHint = profile.adaptivePromptInstruction;
      }
    }

    if (topic && topic !== 'all') {
      focusTopics = [
        { topic, priorityWeight: 3 },
        ...focusTopics.filter((item) => item.topic.toLowerCase() !== topic.toLowerCase()),
      ];
    }

    let generatedFlashcards: Flashcard[] = [];
    let generatedQuiz: Quiz | null = null;
    const generatedQuizzes: Quiz[] = [];

    if (selected.length > 0 && (targetType === 'flashcards' || targetType === 'both')) {
      const perMaterial = Math.max(4, Math.ceil(count / selected.length));
      for (const material of selected) {
        const batch = await this.flashcardAgent.generateFlashcards(
          material.id,
          studentId,
          material.rawContent || material.summary || material.title,
          [material.subject, ...material.keyConcepts].filter((item): item is string => Boolean(item)),
          focusTopics,
          true,
          undefined,
          perMaterial
        );
        generatedFlashcards.push(...batch);
      }
    }

    if (selected.length > 0 && (targetType === 'quiz' || targetType === 'both')) {
      const questionsNeeded = Math.max(4, Math.ceil(count * 0.55));
      const perMaterial = Math.max(3, Math.ceil(questionsNeeded / selected.length));
      for (const material of selected) {
        const quiz = await this.quizAgent.generateQuiz(
          material.id,
          studentId,
          `Sessão Extra: ${topic && topic !== 'all' ? topic : material.title}`,
          material.rawContent || material.summary || material.title,
          focusTopics,
          true,
          undefined,
          perMaterial
        );
        if (quiz) {
          generatedQuizzes.push(quiz);
          generatedQuiz = quiz;
        }
      }
    }

    const dueCards = await this.flashcardRepository.findDueCards(studentId, new Date(), count * 3);
    const bankCards = (await this.flashcardRepository.findByStudentId(studentId, 200)) || [];
    const materialById = new Map(
      (targetMaterials || []).map((material) => [material.id, material] as const)
    );
    const scopedPool = [...dueCards, ...bankCards].filter((card) =>
      cardMatchesSubject(card, materialById.get(card.materialId), topic, allowedSubjects)
    );
    const mixed = composeAdaptiveSession({
      newCards: generatedFlashcards,
      dueCards: scopedPool,
      count,
      excludeIds: input.excludeIds,
    });

    const sessionCards = mixed.session.length > 0 ? mixed.session : generatedFlashcards.slice(0, count);

    const existingQuizzes = (await this.quizRepository.findByStudentId(studentId)) || [];
    const generatedQuizIds = new Set(generatedQuizzes.map((quiz) => quiz.id));
    const bankQuestions = flattenQuizzes(existingQuizzes)
      .filter((item) => !generatedQuizIds.has(item.quizId))
      .filter((item) => questionMatchesTopic(item, topic, allowedSubjects));
    const newQuestions = flattenQuizzes(generatedQuizzes);
    const quizMixed = composeQuizSession({
      newQuestions,
      bankQuestions,
      count,
      excludeIds: input.excludeIds,
      weakTopics,
    });
    const sessionQuestions =
      quizMixed.session.length > 0 ? quizMixed.session : newQuestions.slice(0, count);

    if (
      (targetType === 'flashcards' && sessionCards.length === 0) ||
      (targetType === 'quiz' && sessionQuestions.length === 0) ||
      (targetType === 'both' && sessionCards.length === 0 && sessionQuestions.length === 0)
    ) {
      throw new UnprocessableError(
        'Há material cadastrado, mas o texto pedagógico ainda não foi extraído e não há acervo persistido. Reenvie o arquivo (PDF com texto selecionável ou DOCX) em Materiais.'
      );
    }

    return {
      studentId,
      generatedFlashcardsCount: generatedFlashcards.length,
      generatedQuizId: generatedQuiz?.id,
      flashcards: sessionCards,
      quiz: generatedQuiz,
      weakTopics,
      mixedDueCount: mixed.dueCount,
      adaptiveHint,
      newCardIds: generatedFlashcards.map((card) => card.id),
      sessionQuestions,
      mixedBankCount: quizMixed.bankCount,
      newQuestionIds: newQuestions.map((item) => item.id),
    };
  }
}
