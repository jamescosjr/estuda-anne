import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserController } from '../controllers/UserController.js';

interface UserRoutesOptions {
  controller: UserController;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export async function userRoutes(
  app: FastifyInstance,
  options: UserRoutesOptions
) {
  const { controller, authenticate, requireAdmin } = options;

  // Rota de Perfil do usuário (Autenticado)
  app.put('/profile', { preHandler: authenticate }, (req, reply) => controller.updateProfile(req, reply));

  // Rotas de gerenciamento de estudantes (Restritas a Admin)
  app.post('/students', { preHandler: requireAdmin }, (req, reply) => controller.createStudent(req, reply));
  app.get('/students', { preHandler: requireAdmin }, (req, reply) => controller.listStudents(req, reply));
  app.put('/students/:id', { preHandler: requireAdmin }, (req, reply) => controller.updateStudent(req, reply));
  app.delete('/students/:id', { preHandler: requireAdmin }, (req, reply) => controller.deleteStudent(req, reply));
}
