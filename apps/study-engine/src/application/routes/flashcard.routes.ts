import { FastifyInstance } from 'fastify';
import { FlashcardController } from '../controllers/FlashcardController.js';

export async function flashcardRoutes(
  app: FastifyInstance,
  options: { controller: FlashcardController }
) {
  const { controller } = options;

  app.get('/due', (req, reply) => controller.getDue(req, reply));
  app.post('/:id/review', (req, reply) => controller.review(req, reply));
}
