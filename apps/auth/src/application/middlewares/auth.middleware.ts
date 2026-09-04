import { FastifyReply, FastifyRequest } from 'fastify';
import { ITokenProvider, TokenPayload } from '../../domain/ports/ITokenProvider.js';

declare module 'fastify' {
  interface FastifyRequest {
    userPayload?: TokenPayload;
  }
}

export function createAuthMiddlewares(tokenProvider: ITokenProvider) {
  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Cabeçalho Authorization ausente ou inválido' });
      return;
    }

    const token = authHeader.substring(7);
    try {
      const payload = tokenProvider.verifyToken(token);
      request.userPayload = payload;
    } catch (err: any) {
      reply.status(401).send({ error: 'Unauthorized', message: err.message || 'Token inválido' });
    }
  }

  async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) return;

    if (!request.userPayload || request.userPayload.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Forbidden', message: 'Acesso restrito ao usuário Admin' });
    }
  }

  return { authenticate, requireAdmin };
}
