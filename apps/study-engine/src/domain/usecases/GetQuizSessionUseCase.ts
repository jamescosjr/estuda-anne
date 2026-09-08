import { IQuizRepository } from '../ports/IQuizRepository.js';
import { IStudentAdaptiveProfileRepository } from './EvaluateQuizUseCase.js';
import {
  composeQuizSession,
  flattenQuizzes,
  questionMatchesTopic,
  QuizBankItem,
} from '../services/QuizStudySession.js';
import { isGenericPlaceholderPrompt, isPedagogicallyOffTopic } from '../services/StudyCorpusSanitizer.js';

export interface GetQuizSessionInput {
  studentId: string;
  count?: number;
  topic?: string;
  excludeIds?: string[];
}

export interface GetQuizSessionOutput {
  studentId: string;
  questions: QuizBankItem[];
  bankCount: number;
  weakTopics: string[];
  adaptiveHint: string;
}

export class GetQuizSessionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly profileRepository?: IStudentAdaptiveProfileRepository
  ) {}

  public async execute(input: GetQuizSessionInput): Promise<GetQuizSessionOutput> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('studentId is required to compose a quiz session');
    }

    const count = Math.min(20, Math.max(3, input.count ?? 8));
    const quizzes = (await this.quizRepository.findByStudentId(input.studentId)) || [];
    const bank = flattenQuizzes(quizzes).filter(
      (item) =>
        questionMatchesTopic(item, input.topic) &&
        !isGenericPlaceholderPrompt(item.prompt) &&
        !isPedagogicallyOffTopic(item.prompt)
    );

    let weakTopics: string[] = [];
    let adaptiveHint = 'Distribuição uniforme entre as questões já persistidas.';

    if (this.profileRepository) {
      const profile = await this.profileRepository.findByStudentId(input.studentId);
      if (profile) {
        weakTopics = Object.entries(profile.topicWeights || {})
          .filter(([, detail]) => detail.priorityWeight > 1.5)
          .sort((a, b) => b[1].priorityWeight - a[1].priorityWeight)
          .map(([topic]) => topic);
        adaptiveHint = profile.adaptivePromptInstruction;
      }
    }

    const mixed = composeQuizSession({
      newQuestions: [],
      bankQuestions: bank,
      count,
      excludeIds: input.excludeIds,
      weakTopics,
    });

    return {
      studentId: input.studentId,
      questions: mixed.session,
      bankCount: mixed.bankCount,
      weakTopics,
      adaptiveHint,
    };
  }
}
