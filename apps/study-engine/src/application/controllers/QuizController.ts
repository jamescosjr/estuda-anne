import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { EvaluateQuizUseCase } from '../../domain/usecases/EvaluateQuizUseCase.js';
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

export class QuizController {
  constructor(
    private readonly evaluateQuizUseCase: EvaluateQuizUseCase,
    private readonly quizRepository?: IQuizRepository
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
}
