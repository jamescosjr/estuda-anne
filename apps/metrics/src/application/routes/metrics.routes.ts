import { FastifyInstance } from 'fastify';
import { MetricsController } from '../controllers/MetricsController.js';

export async function metricsRoutes(
  app: FastifyInstance,
  options: { metricsController: MetricsController }
) {
  const { metricsController } = options;

  app.get('/metrics/overview', metricsController.getOverview);
  app.get('/metrics/schedule-adherence', metricsController.getScheduleAdherence);
  app.get('/metrics/evolution', metricsController.getEvolution);

  app.get('/health', async (_req, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'metrics-service' });
  });
}
