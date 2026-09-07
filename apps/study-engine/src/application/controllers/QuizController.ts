import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { EvaluateQuizUseCase } from '../../domain/usecases/EvaluateQuizUseCase.js';
import { GenerateExtraSessionUseCase } from '../../domain/usecases/GenerateExtraSessionUseCase.js';
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

const ExtraSessionBodySchema = z.object({
  studentId: z.string().min(1),
  materialId: z.string().optional(),
});

export class QuizController {
  constructor(
    private readonly evaluateQuizUseCase: EvaluateQuizUseCase,
    private readonly quizRepository?: IQuizRepository,
    private readonly extraSessionUseCase?: GenerateExtraSessionUseCase
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
      targetType: 'quiz',
    });

    reply.status(201).send({
      message: 'Sessão extra de quiz gerada e persistida com sucesso!',
      weakTopics: result.weakTopics,
      quiz: result.quiz ? result.quiz.toJSON() : null,
    });
  }
}
