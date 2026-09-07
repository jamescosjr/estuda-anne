import { FastifyInstance } from 'fastify';
import { QuizController } from '../controllers/QuizController.js';

export async function quizRoutes(
  app: FastifyInstance,
  options: { controller: QuizController }
) {
  const { controller } = options;
  app.get('/', (req, reply) => controller.listByStudent(req, reply));
  app.post('/extra-session', (req, reply) => controller.generateExtraSession(req, reply));
  app.post('/:id/evaluate', (req, reply) => controller.evaluate(req, reply));
}
