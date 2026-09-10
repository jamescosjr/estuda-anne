import { IQuizRepository } from '../ports/IQuizRepository.js';
import { QuizEvaluationResult } from '../entities/Quiz.js';
import { NotFoundError } from '../errors/DomainError.js';
import { StudentAdaptiveProfile } from '../entities/StudentAdaptiveProfile.js';
import { IStudyScheduleRepository } from '../ports/IStudyScheduleRepository.js';

export interface EvaluateQuizDTO {
  quizId: string;
  studentId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIndex: number;
    topic?: string;
  }>;
}

export interface EvaluateQuizOutput {
  evaluation: QuizEvaluationResult;
  adaptiveProfile: {
    studentId: string;
    adaptivePromptInstruction: string;
    weakTopics: string[];
    topicWeights: Record<string, { correct: number; wrong: number; priorityWeight: number }>;
  };
}

export interface IStudentAdaptiveProfileRepository {
  findByStudentId(studentId: string): Promise<StudentAdaptiveProfile | null>;
  save(profile: StudentAdaptiveProfile): Promise<void>;
}

export class EvaluateQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly profileRepository?: IStudentAdaptiveProfileRepository,
    private readonly scheduleRepository?: IStudyScheduleRepository
  ) {}

  public async execute(dto: EvaluateQuizDTO): Promise<EvaluateQuizOutput> {
    const quiz = await this.quizRepository.findById(dto.quizId);
    if (!quiz) {
      throw new NotFoundError(`Quiz não encontrado para o id: ${dto.quizId}`);
    }

    const evaluation = quiz.evaluate(dto.answers);

    // Mapeamento dos resultados por tópico para cálculo da mecânica de pesos adaptativos
    const topicResults: Array<{ topic: string; isCorrect: boolean }> = [];
    const questionTopicMap = new Map<string, string>();

    for (const ans of dto.answers) {
      if (ans.topic) {
        questionTopicMap.set(ans.questionId, ans.topic);
      }
    }

    for (const fb of evaluation.feedback) {
      const q = quiz.questions.find((item) => item.id === fb.questionId);
      const topicName = questionTopicMap.get(fb.questionId) || q?.prompt.slice(0, 30) || 'Geral';
      topicResults.push({
        topic: topicName,
        isCorrect: fb.isCorrect,
      });
    }

    let profile = this.profileRepository
      ? await this.profileRepository.findByStudentId(dto.studentId)
      : null;

    if (!profile) {
      profile = StudentAdaptiveProfile.createDefault(dto.studentId);
    }

    const updatedProfile = profile.recordQuizResult(topicResults);

    if (this.profileRepository) {
      await this.profileRepository.save(updatedProfile);
    }

    if (this.scheduleRepository) {
      try {
        const schedule = await this.scheduleRepository.findByStudentId(dto.studentId);
        if (schedule) {
          let updated = false;
          const now = new Date();
          for (const item of schedule.items) {
            if (!item.completed && (item.quizIds?.includes(dto.quizId) || item.quizIds?.length)) {
              item.completed = true;
              item.completedAt = now;
              updated = true;
            }
          }
          if (updated) {
            await this.scheduleRepository.save(schedule);
          }
        }
      } catch {
        // Log ou tratamento resiliente de erro
      }
    }

    const weakTopics = Object.entries(updatedProfile.topicWeights)
      .filter(([_, detail]) => detail.priorityWeight > 1.5)
      .map(([topic]) => topic);

    return {
      evaluation,
      adaptiveProfile: {
        studentId: updatedProfile.studentId,
        adaptivePromptInstruction: updatedProfile.adaptivePromptInstruction,
        weakTopics,
        topicWeights: updatedProfile.topicWeights,
      },
    };
  }
}
