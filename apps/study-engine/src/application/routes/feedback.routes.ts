import { FastifyInstance } from 'fastify';
import { AIFeedbackController } from '../controllers/AIFeedbackController.js';

export async function feedbackRoutes(
  app: FastifyInstance,
  options: { controller: AIFeedbackController }
) {
  const { controller } = options;

  app.post('/feedback', (req, reply) => controller.submit(req, reply));
  app.post('/api/feedback', (req, reply) => controller.submit(req, reply));
  app.get('/feedback/summary', (req, reply) => controller.getSummary(req, reply));
  app.get('/api/feedback/summary', (req, reply) => controller.getSummary(req, reply));
}
