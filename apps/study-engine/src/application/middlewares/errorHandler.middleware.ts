import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../../domain/errors/DomainError.js';

function isZodError(error: unknown): error is ZodError {
  if (error instanceof ZodError) {
    return true;
  }
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'ZodError' &&
    (Array.isArray((error as { issues?: unknown }).issues) || Array.isArray((error as { errors?: unknown }).errors))
  );
}

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (isZodError(error)) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: error.errors ?? (error as ZodError).issues,
    });
    return;
  }

  if (error instanceof DomainError) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    statusCode,
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
  });
}
