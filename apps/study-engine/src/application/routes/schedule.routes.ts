import { FastifyInstance } from 'fastify';
import { ScheduleController } from '../controllers/ScheduleController.js';

export async function scheduleRoutes(
  app: FastifyInstance,
  options: { controller: ScheduleController }
) {
  const { controller } = options;

  app.post('/generate', (req, reply) => controller.generate(req, reply));
  app.post('/exam-sprint', (req, reply) => controller.generateExamSprint(req, reply));
  app.post('/analyze-file', (req, reply) => controller.analyzeFile(req, reply));
  app.get('/', (req, reply) => controller.getByStudent(req, reply));
  app.post('/items/:itemId/complete', (req, reply) => controller.completeItem(req, reply));
}
