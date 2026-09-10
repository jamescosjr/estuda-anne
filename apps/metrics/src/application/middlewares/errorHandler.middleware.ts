import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erro interno no microserviço de métricas';

  reply.status(statusCode).send({
    error: error.name || 'InternalServerError',
    message,
  });
}
