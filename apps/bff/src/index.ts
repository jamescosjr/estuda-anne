import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import path from 'path';
import { studyRoutes } from './application/routes/studyRoutes.js';
import { authRoutes } from './application/routes/authRoutes.js';
import { DailyBriefingListener } from './application/listeners/DailyBriefingListener.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export async function bootstrapBFF() {
  const app = Fastify({ logger: true, ignoreTrailingSlash: true });
  DailyBriefingListener.initialize();

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
      return cb(new Error('Not allowed by CORS'), false);
    },
  });
  await app.register(studyRoutes);
  await app.register(authRoutes);

  app.get('/health', async () => {
    return { service: 'estuda-anne-bff', status: 'healthy', timestamp: new Date().toISOString() };
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrapBFF().then((app) => {
    const port = Number(process.env.BFF_PORT) || 3001;
    app.listen({ port, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`BFF running at ${address}`);
    });
  });
}
