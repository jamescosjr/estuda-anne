import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { errorHandler } from './application/middlewares/errorHandler.middleware.js';
import { MongoConnection } from './infrastructure/persistence/mongo/MongoConnection.js';
import { MongoMaterialRepository } from './infrastructure/persistence/mongo/repositories/MongoMaterialRepository.js';
import { MongoFlashcardRepository } from './infrastructure/persistence/mongo/repositories/MongoFlashcardRepository.js';
import { MongoQuizRepository } from './infrastructure/persistence/mongo/repositories/MongoQuizRepository.js';
import { MongoStudyScheduleRepository } from './infrastructure/persistence/mongo/repositories/MongoStudyScheduleRepository.js';
import { MongoVectorRepository } from './infrastructure/persistence/mongo/repositories/MongoVectorRepository.js';
import { MongoAIFeedbackRepository } from './infrastructure/persistence/mongo/repositories/MongoAIFeedbackRepository.js';
import { GeminiFlashAdapter } from './infrastructure/ai/GeminiFlashAdapter.js';
import { WhisperAdapter } from './infrastructure/ai/WhisperAdapter.js';
import { CloudflareR2StorageProvider } from './infrastructure/storage/CloudflareR2StorageProvider.js';
import { env } from './infrastructure/config/env.js';
import { ProcessMaterialUseCase } from './domain/usecases/ProcessMaterialUseCase.js';
import { ReviewFlashcardUseCase } from './domain/usecases/ReviewFlashcardUseCase.js';
import { GetDueFlashcardsUseCase } from './domain/usecases/GetDueFlashcardsUseCase.js';
import { GenerateStudyScheduleUseCase } from './domain/usecases/GenerateStudyScheduleUseCase.js';
import { CompleteScheduleItemUseCase } from './domain/usecases/CompleteScheduleItemUseCase.js';
import { DeleteMaterialUseCase } from './domain/usecases/DeleteMaterialUseCase.js';
import { CloseSemesterUseCase } from './domain/usecases/CloseSemesterUseCase.js';
import { EvaluateQuizUseCase } from './domain/usecases/EvaluateQuizUseCase.js';
import { SubmitAIFeedbackUseCase } from './domain/usecases/SubmitAIFeedbackUseCase.js';
import { MaterialController } from './application/controllers/MaterialController.js';
import { FlashcardController } from './application/controllers/FlashcardController.js';
import { ScheduleController } from './application/controllers/ScheduleController.js';
import { QuizController } from './application/controllers/QuizController.js';
import { SemesterController } from './application/controllers/SemesterController.js';
import { AIFeedbackController } from './application/controllers/AIFeedbackController.js';
import { materialRoutes } from './application/routes/material.routes.js';
import { flashcardRoutes } from './application/routes/flashcard.routes.js';
import { scheduleRoutes } from './application/routes/schedule.routes.js';
import { quizRoutes } from './application/routes/quiz.routes.js';
import { semesterRoutes } from './application/routes/semester.routes.js';
import { feedbackRoutes } from './application/routes/feedback.routes.js';
import { IStorageProvider } from './domain/ports/IStorageProvider.js';
import { InMemoryJobQueueAdapter } from './infrastructure/queue/InMemoryJobQueueAdapter.js';
import { DocumentTextExtractor } from './infrastructure/extraction/DocumentTextExtractor.js';
import { AnalyzeScheduleFileUseCase } from './domain/usecases/AnalyzeScheduleFileUseCase.js';
import { CORRELATION_HEADER, createCorrelationId } from './infrastructure/observability/structuredLog.js';

export interface BootstrapOptions {
  connectMongo?: boolean;
}

function createStorageProvider(): IStorageProvider {
  if (
    env.CLOUDFLARE_R2_ACCOUNT_ID &&
    env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    env.CLOUDFLARE_R2_BUCKET_NAME
  ) {
    return new CloudflareR2StorageProvider({
      accountId: env.CLOUDFLARE_R2_ACCOUNT_ID,
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucketName: env.CLOUDFLARE_R2_BUCKET_NAME,
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
    });
  }

  return {
    upload: async () => ({ fileUrl: '', fileKey: '' }),
    delete: async () => {},
    deleteBatch: async () => {},
  };
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

  app.addHook('onRequest', async (request, reply) => {
    const correlationId = String(request.headers[CORRELATION_HEADER] || createCorrelationId());
    request.headers[CORRELATION_HEADER] = correlationId;
    reply.header(CORRELATION_HEADER, correlationId);
  });

  app.get('/health', async () => {
    return {
      service: 'estuda-anne-study-engine',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  if (options.connectMongo !== false) {
    const mongo = MongoConnection.getInstance();
    const db = await mongo.connect();

    const materialRepo = new MongoMaterialRepository(db);
    const flashcardRepo = new MongoFlashcardRepository(db);
    const quizRepo = new MongoQuizRepository(db);
    const scheduleRepo = new MongoStudyScheduleRepository(db);
    const vectorRepo = new MongoVectorRepository(db);
    const feedbackRepo = new MongoAIFeedbackRepository(db);
    const storageProvider = createStorageProvider();
    const contentExtractor = new DocumentTextExtractor();
    const jobQueue = new InMemoryJobQueueAdapter();

    const geminiAdapter = new GeminiFlashAdapter();
    const whisperAdapter = new WhisperAdapter();

    const processMaterialUseCase = new ProcessMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      geminiAdapter,
      whisperAdapter,
      vectorRepo,
      contentExtractor
    );
    const reviewFlashcardUseCase = new ReviewFlashcardUseCase(flashcardRepo);
    const getDueFlashcardsUseCase = new GetDueFlashcardsUseCase(flashcardRepo);
    const generateScheduleUseCase = new GenerateStudyScheduleUseCase(
      scheduleRepo,
      materialRepo,
      flashcardRepo
    );
    const completeScheduleItemUseCase = new CompleteScheduleItemUseCase(scheduleRepo);
    const deleteMaterialUseCase = new DeleteMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      vectorRepo,
      storageProvider
    );
    const closeSemesterUseCase = new CloseSemesterUseCase(
      materialRepo,
      storageProvider,
      vectorRepo,
      flashcardRepo,
      quizRepo,
      scheduleRepo
    );
    const analyzeScheduleFileUseCase = new AnalyzeScheduleFileUseCase(geminiAdapter);
    const evaluateQuizUseCase = new EvaluateQuizUseCase(quizRepo);
    const submitAIFeedbackUseCase = new SubmitAIFeedbackUseCase(feedbackRepo);

    jobQueue.registerHandler(async (payload) => {
      await processMaterialUseCase.execute({
        materialId: payload.materialId,
        textContent: payload.textContent,
        fileBase64: payload.fileBase64,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
      });
    });

    const materialController = new MaterialController(
      materialRepo,
      processMaterialUseCase,
      deleteMaterialUseCase,
      jobQueue
    );
    const flashcardController = new FlashcardController(reviewFlashcardUseCase, getDueFlashcardsUseCase);
    const scheduleController = new ScheduleController(
      generateScheduleUseCase,
      completeScheduleItemUseCase,
      scheduleRepo,
      analyzeScheduleFileUseCase
    );
    const quizController = new QuizController(evaluateQuizUseCase, quizRepo);
    const semesterController = new SemesterController(closeSemesterUseCase);
    const feedbackController = new AIFeedbackController(submitAIFeedbackUseCase, feedbackRepo);

    await app.register(materialRoutes, { prefix: '/materials', controller: materialController });
    await app.register(flashcardRoutes, { prefix: '/flashcards', controller: flashcardController });
    await app.register(scheduleRoutes, { prefix: '/schedule', controller: scheduleController });
    await app.register(quizRoutes, { prefix: '/quizzes', controller: quizController });
    await app.register(semesterRoutes, { prefix: '/semesters', controller: semesterController });
    await app.register(feedbackRoutes, { controller: feedbackController });
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
