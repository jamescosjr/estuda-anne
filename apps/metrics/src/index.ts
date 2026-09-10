import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './infrastructure/config/env.js';
import { errorHandler } from './application/middlewares/errorHandler.middleware.js';
import { MongoConnection } from './infrastructure/persistence/mongo/MongoConnection.js';
import { MongoMetricsRepository } from './infrastructure/persistence/mongo/repositories/MongoMetricsRepository.js';
import { GetStudentMetricsUseCase } from './domain/usecases/GetStudentMetricsUseCase.js';
import { MetricsController } from './application/controllers/MetricsController.js';
import { metricsRoutes } from './application/routes/metrics.routes.js';

export interface BootstrapOptions {
  connectMongo?: boolean;
}

export async function bootstrapMetrics(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    ignoreTrailingSlash: true,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowedOrigins = [
        'https://estuda-anne.singulartech.space',
        'http://estuda-anne.singulartech.space',
      ];
      if (process.env.CORS_ORIGIN) {
        allowedOrigins.push(process.env.CORS_ORIGIN);
      }
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setErrorHandler(errorHandler);

  let metricsRepository: any;

  if (options.connectMongo !== false) {
    try {
      const db = await MongoConnection.getInstance().connect(env.MONGODB_URI);
      metricsRepository = new MongoMetricsRepository(db);
      app.log.info('Conectado ao MongoDB no microserviço Metrics');
    } catch (err) {
      app.log.error({ err }, 'Falha ao conectar ao MongoDB no arranque do Metrics');
    }
  }

  const getStudentMetricsUseCase = new GetStudentMetricsUseCase(metricsRepository);
  const metricsController = new MetricsController(getStudentMetricsUseCase);

  await app.register(metricsRoutes, { metricsController });

  return app;
}

async function start() {
  try {
    const app = await bootstrapMetrics();
    const port = env.METRICS_SERVICE_PORT;
    const host = env.METRICS_SERVICE_HOST;
    await app.listen({ port, host });
    app.log.info(`Microserviço Metrics rodando em http://${host}:${port}`);
  } catch (err) {
    console.error('Erro fatal no microserviço Metrics:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
