import { FastifyInstance } from 'fastify';
import { MaterialController } from '../controllers/MaterialController.js';

export async function materialRoutes(
  app: FastifyInstance,
  options: { controller: MaterialController }
) {
  const { controller } = options;

  app.post('/', (req, reply) => controller.create(req, reply));
  app.post('', (req, reply) => controller.create(req, reply));
  app.get('/', (req, reply) => controller.getByStudentId(req, reply));
  app.get('', (req, reply) => controller.getByStudentId(req, reply));
  app.get('/:id', (req, reply) => controller.getById(req, reply));
  app.post('/:id/process', (req, reply) => controller.process(req, reply));
}
