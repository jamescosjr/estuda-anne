import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticateUserUseCase } from '../../domain/usecases/AuthenticateUserUseCase.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  constructor(private readonly authenticateUserUseCase: AuthenticateUserUseCase) {}

  public async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = LoginSchema.parse(request.body);
    const result = await this.authenticateUserUseCase.execute({
      email: body.email,
      passwordText: body.password,
    });
    reply.status(200).send(result);
  }
}
