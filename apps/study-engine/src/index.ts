import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { errorHandler } from './application/middlewares/errorHandler.middleware.js';
import { MongoConnection } from './infrastructure/persistence/mongo/MongoConnection.js';
import { MongoMaterialRepository } from './infrastructure/persistence/mongo/repositories/MongoMaterialRepository.js';
import { MongoFlashcardRepository } from './infrastructure/persistence/mongo/repositories/MongoFlashcardRepository.js';
import { MongoQuizRepository } from './infrastructure/persistence/mongo/repositories/MongoQuizRepository.js';
import { GeminiFlashAdapter } from './infrastructure/ai/GeminiFlashAdapter.js';
import { WhisperAdapter } from './infrastructure/ai/WhisperAdapter.js';
import { ProcessMaterialUseCase } from './domain/usecases/ProcessMaterialUseCase.js';
import { ReviewFlashcardUseCase } from './domain/usecases/ReviewFlashcardUseCase.js';
import { GetDueFlashcardsUseCase } from './domain/usecases/GetDueFlashcardsUseCase.js';
import { MaterialController } from './application/controllers/MaterialController.js';
import { FlashcardController } from './application/controllers/FlashcardController.js';
import { materialRoutes } from './application/routes/material.routes.js';
import { flashcardRoutes } from './application/routes/flashcard.routes.js';

import { MongoAIFeedbackRepository } from './infrastructure/persistence/mongo/repositories/MongoAIFeedbackRepository.js';
import { SubmitAIFeedbackUseCase } from './domain/usecases/SubmitAIFeedbackUseCase.js';
import { AIFeedbackController } from './application/controllers/AIFeedbackController.js';
import { feedbackRoutes } from './application/routes/feedback.routes.js';

export interface BootstrapOptions {
  connectMongo?: boolean;
}

export async function bootstrapStudyEngine(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, ignoreTrailingSlash: true });

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
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => {
    return {
      service: 'estuda-anne-study-engine',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  if (options.connectMongo !== false) {
    try {
      const mongo = MongoConnection.getInstance();
      const db = await mongo.connect();

      // Repositórios Concretos
      const materialRepo = new MongoMaterialRepository(db);
      const flashcardRepo = new MongoFlashcardRepository(db);
      const quizRepo = new MongoQuizRepository(db);
      const feedbackRepo = new MongoAIFeedbackRepository(db);

      // Adaptadores de IA
      const geminiAdapter = new GeminiFlashAdapter();
      const whisperAdapter = new WhisperAdapter();

      // Use Cases do Domínio Puro
      const processMaterialUseCase = new ProcessMaterialUseCase(
        materialRepo,
        flashcardRepo,
        quizRepo,
        geminiAdapter,
        whisperAdapter
      );
      const reviewFlashcardUseCase = new ReviewFlashcardUseCase(flashcardRepo);
      const getDueFlashcardsUseCase = new GetDueFlashcardsUseCase(flashcardRepo);
      const submitAIFeedbackUseCase = new SubmitAIFeedbackUseCase(feedbackRepo);

      // Controllers
      const materialController = new MaterialController(materialRepo, processMaterialUseCase);
      const flashcardController = new FlashcardController(reviewFlashcardUseCase, getDueFlashcardsUseCase);
      const feedbackController = new AIFeedbackController(submitAIFeedbackUseCase, feedbackRepo);

      // Registro de Rotas
      await app.register(materialRoutes, { prefix: '/materials', controller: materialController });
      await app.register(flashcardRoutes, { prefix: '/flashcards', controller: flashcardController });
      await app.register(feedbackRoutes, { controller: feedbackController });
    } catch (err) {
      app.log.warn({ err }, 'MongoDB connection skipped or failed during bootstrap. Running in degraded mode.');
    }
  }

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrapStudyEngine().then((app) => {
    const port = Number(process.env.STUDY_ENGINE_PORT) || 3002;
    app.listen({ port, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`Study Engine running at ${address}`);
    });
  });
}
