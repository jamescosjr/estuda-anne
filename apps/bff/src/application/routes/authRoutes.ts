import { FastifyInstance } from 'fastify';
import { DomainEventBus } from '../../domain/events/DomainEventBus.js';
import { UserLoggedInEvent } from '../../domain/events/UserLoggedInEvent.js';
import { UserProfileUpdatedEvent } from '../../domain/events/UserProfileUpdatedEvent.js';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3005';

export async function authRoutes(app: FastifyInstance) {
  // Rota de Login de Usuários (Admin e Estudantes)
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });

      const data = await res.json() as any;

      if (res.ok && data?.user) {
        // Dispara o Domain Event UserLoggedInEvent de forma não bloqueante
        DomainEventBus.getInstance().publish(
          new UserLoggedInEvent({
            userId: data.user.id || data.user.studentId || 'anne-student-1',
            studentName: data.user.name || 'Anne',
            email: data.user.email || '',
            subjects: data.user.subjects || [],
          })
        ).catch((err) => app.log.error({ err }, 'Erro ao publicar UserLoggedInEvent'));
      }

      return reply.status(res.status).send(data);
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao comunicar com o Auth Service');
      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'Falha ao realizar login no Auth Service: ' + (err.message || String(err)),
      });
    }
  });

  // Atualizar perfil do usuário autenticado (Estudante/Admin)
  app.put('/api/users/profile', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization || '';
      const res = await fetch(`${AUTH_SERVICE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(request.body),
      });

      const data = await res.json() as any;

      if (res.ok && data) {
        DomainEventBus.getInstance().publish(
          new UserProfileUpdatedEvent({
            userId: data.id || data.userId || 'anne-student-1',
            studentName: data.name || 'Estudante',
            email: data.email || '',
            subjects: data.subjects || [],
          })
        ).catch((err) => app.log.error({ err }, 'Erro ao publicar UserProfileUpdatedEvent'));
      }

      return reply.status(res.status).send(data);
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao atualizar perfil no Auth Service');
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Criar estudante (Restrito ao Admin)
  app.post('/api/users/students', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization || '';
      const res = await fetch(`${AUTH_SERVICE_URL}/users/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(request.body),
      });

      const data = await res.json();
      return reply.status(res.status).send(data);
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao criar estudante no Auth Service');
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Listar estudantes (Restrito ao Admin)
  app.get('/api/users/students', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization || '';
      const { search, page, limit } = (request.query as { search?: string; page?: string; limit?: string }) || {};

      const baseUrl = AUTH_SERVICE_URL.replace(/\/+$/, '');
      const url = new URL(`${baseUrl}/users/students`);
      if (search) url.searchParams.set('search', search);
      if (page) url.searchParams.set('page', page);
      if (limit) url.searchParams.set('limit', limit);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      return reply.status(res.status).send(data);
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao listar estudantes no Auth Service');
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Atualizar estudante (Restrito ao Admin)
  app.put('/api/users/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const authHeader = request.headers.authorization || '';
      const res = await fetch(`${AUTH_SERVICE_URL}/users/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(request.body),
      });

      const data = await res.json();
      return reply.status(res.status).send(data);
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Deletar estudante (Restrito ao Admin)
  app.delete('/api/users/students/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const authHeader = request.headers.authorization || '';
      const res = await fetch(`${AUTH_SERVICE_URL}/users/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });

      const data = await res.json();
      return reply.status(res.status).send(data);
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });
}
