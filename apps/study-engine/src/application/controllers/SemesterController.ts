import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CloseSemesterUseCase } from '../../domain/usecases/CloseSemesterUseCase.js';

const CloseSemesterBodySchema = z.object({
  studentId: z.string().min(1),
});

export class SemesterController {
  constructor(private readonly closeSemesterUseCase: CloseSemesterUseCase) {}

  public async close(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = CloseSemesterBodySchema.parse(request.body);
    const result = await this.closeSemesterUseCase.execute(body);
    reply.status(200).send(result);
  }
}
