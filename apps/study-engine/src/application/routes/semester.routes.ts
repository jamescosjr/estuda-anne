import { FastifyInstance } from 'fastify';
import { SemesterController } from '../controllers/SemesterController.js';

export async function semesterRoutes(
  app: FastifyInstance,
  options: { controller: SemesterController }
) {
  const { controller } = options;
  app.post('/close', (req, reply) => controller.close(req, reply));
}
