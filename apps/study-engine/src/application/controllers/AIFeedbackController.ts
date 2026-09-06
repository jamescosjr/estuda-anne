import { FastifyReply, FastifyRequest } from 'fastify';
import { SubmitAIFeedbackUseCase } from '../../domain/usecases/SubmitAIFeedbackUseCase.js';
import { IAIFeedbackRepository } from '../../domain/ports/IAIFeedbackRepository.js';

export class AIFeedbackController {
  constructor(
    private submitFeedbackUseCase: SubmitAIFeedbackUseCase,
    private feedbackRepository: IAIFeedbackRepository
  ) {}

  public async submit(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = req.body as any;
      const result = await this.submitFeedbackUseCase.execute({
        studentId: body.studentId || 'guest-student',
        targetType: body.targetType,
        targetId: body.targetId,
        subject: body.subject,
        rating: body.rating,
        reasonTag: body.reasonTag,
        comment: body.comment,
      });

      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: err.message || 'Falha ao salvar feedback',
      });
    }
  }

  public async getSummary(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { studentId = 'guest-student' } = (req.query as any) || {};
      const profile = await this.feedbackRepository.getAdaptiveProfile(studentId);
      return reply.status(200).send(profile);
    } catch (err: any) {
      return reply.status(500).send({
        error: 'InternalServerError',
        message: err.message || 'Falha ao buscar perfil adaptativo',
      });
    }
  }
}
