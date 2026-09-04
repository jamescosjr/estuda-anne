import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/AuthController.js';

export async function authRoutes(
  app: FastifyInstance,
  options: { controller: AuthController }
) {
  const { controller } = options;

  app.post('/login', (req, reply) => controller.login(req, reply));
}
