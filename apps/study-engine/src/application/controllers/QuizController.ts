import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { EvaluateQuizUseCase } from '../../domain/usecases/EvaluateQuizUseCase.js';
import { GenerateExtraSessionUseCase } from '../../domain/usecases/GenerateExtraSessionUseCase.js';
import { GetQuizSessionUseCase } from '../../domain/usecases/GetQuizSessionUseCase.js';
import { IQuizRepository } from '../../domain/ports/IQuizRepository.js';

const EvaluateQuizBodySchema = z.object({
  studentId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptionIndex: z.number().int().nonnegative(),
    topic: z.string().optional(),
  })),
});

const EvaluateQuizParamsSchema = z.object({
  id: z.string().min(1),
});

const allowedSubjectsSchema = z
  .union([
    z.array(z.string()),
    z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
  ])
  .optional();

const ExtraSessionBodySchema = z
  .object({
    studentId: z.string().min(1),
    materialId: z.string().optional(),
    topic: z.string().optional(),
    subjectId: z.string().optional(),
    allowedSubjects: allowedSubjectsSchema,
    subjects: allowedSubjectsSchema,
    count: z.coerce.number().int().min(3).max(20).optional(),
    excludeIds: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    ...data,
    allowedSubjects: data.allowedSubjects ?? data.subjects,
  }));

const QuizSessionQuerySchema = z
  .object({
    studentId: z.string().min(1),
    topic: z.string().optional(),
    allowedSubjects: allowedSubjectsSchema,
    subjects: allowedSubjectsSchema,
    count: z.coerce.number().int().min(3).max(20).optional(),
  })
  .transform((data) => ({
    ...data,
    allowedSubjects: data.allowedSubjects ?? data.subjects,
  }));

export class QuizController {
  constructor(
    private readonly evaluateQuizUseCase: EvaluateQuizUseCase,
    private readonly quizRepository?: IQuizRepository,
    private readonly extraSessionUseCase?: GenerateExtraSessionUseCase,
    private readonly getQuizSessionUseCase?: GetQuizSessionUseCase
  ) {}

  public async listByStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = z.object({ studentId: z.string().min(1) }).parse(request.query);
    if (!this.quizRepository) {
      reply.status(200).send([]);
      return;
    }
    const quizzes = await this.quizRepository.findByStudentId(query.studentId);
    reply.status(200).send(quizzes.map((quiz) => quiz.toJSON()));
  }

  public async getSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = QuizSessionQuerySchema.parse(request.query);
    if (!this.getQuizSessionUseCase) {
      reply.status(501).send({ message: 'GetQuizSessionUseCase indisponível' });
      return;
    }

    const result = await this.getQuizSessionUseCase.execute({
      studentId: query.studentId,
      topic: query.topic,
      allowedSubjects: query.allowedSubjects,
      count: query.count,
    });

    reply.status(200).send(result);
  }

  public async evaluate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = EvaluateQuizParamsSchema.parse(request.params);
    const body = EvaluateQuizBodySchema.parse(request.body);
    const result = await this.evaluateQuizUseCase.execute({
      quizId: params.id,
      studentId: body.studentId,
      answers: body.answers,
    });
    reply.status(200).send(result);
  }

  public async generateExtraSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.extraSessionUseCase) {
      reply.status(501).send({ message: 'GenerateExtraSessionUseCase indisponível' });
      return;
    }

    const body = ExtraSessionBodySchema.parse(request.body);
    const result = await this.extraSessionUseCase.execute({
      studentId: body.studentId,
      materialId: body.materialId,
      topic: body.topic || body.subjectId,
      allowedSubjects: body.allowedSubjects,
      count: body.count,
      excludeIds: body.excludeIds,
      targetType: 'quiz',
    });

    reply.status(201).send({
      message: 'Sessão extra de quiz gerada, persistida e misturada com o acervo.',
      weakTopics: result.weakTopics,
      adaptiveHint: result.adaptiveHint,
      generatedCount: result.newQuestionIds.length,
      mixedBankCount: result.mixedBankCount,
      newQuestionIds: result.newQuestionIds,
      questions: result.sessionQuestions,
      quiz: result.quiz ? result.quiz.toJSON() : null,
    });
  }
}
