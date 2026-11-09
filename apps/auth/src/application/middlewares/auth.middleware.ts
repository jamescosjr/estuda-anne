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
    if (!authHeader || !authHeader.trim()) {
      request.log.warn(
        {
          cid: request.id,
          event: 'auth_rejected',
          reason: 'missing_authorization_header',
          code: 'MISSING_AUTH_HEADER',
          method: request.method,
          url: request.url,
        },
        'Requisição rejeitada: cabeçalho Authorization ausente'
      );
      reply.status(401).send({
        error: 'Unauthorized',
        code: 'MISSING_AUTH_HEADER',
        reason: 'missing_authorization_header',
        message: 'Cabeçalho Authorization ausente ou inválido',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ') || !authHeader.substring(7).trim()) {
      request.log.warn(
        {
          cid: request.id,
          event: 'auth_rejected',
          reason: 'malformed_authorization_header',
          code: 'MALFORMED_AUTH_HEADER',
          method: request.method,
          url: request.url,
        },
        'Requisição rejeitada: formato do cabeçalho Authorization inválido'
      );
      reply.status(401).send({
        error: 'Unauthorized',
        code: 'MALFORMED_AUTH_HEADER',
        reason: 'malformed_authorization_header',
        message: 'Cabeçalho Authorization ausente ou inválido',
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    try {
      const payload = tokenProvider.verifyToken(token);
      request.userPayload = payload;
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError';
      const reason = isExpired ? 'token_expired' : 'invalid_token';
      const code = isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';

      request.log.warn(
        {
          cid: request.id,
          event: 'auth_rejected',
          reason,
          code,
          errorName: err?.name || 'Error',
          method: request.method,
          url: request.url,
        },
        'Requisição rejeitada: falha na validação do token JWT'
      );

      reply.status(401).send({
        error: 'Unauthorized',
        code,
        reason,
        message: isExpired ? 'Sua sessão expirou. Faça login novamente.' : err.message || 'Token inválido',
      });
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
