import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './infrastructure/config/env.js';
import { MongoConnection } from './infrastructure/persistence/mongo/MongoConnection.js';
import { MongoUserRepository } from './infrastructure/persistence/mongo/repositories/MongoUserRepository.js';
import { InMemoryUserRepository } from './infrastructure/persistence/inmemory/InMemoryUserRepository.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenProvider } from './infrastructure/security/JwtTokenProvider.js';
import { SeedAdminUserUseCase } from './domain/usecases/SeedAdminUserUseCase.js';
import { AuthenticateUserUseCase } from './domain/usecases/AuthenticateUserUseCase.js';
import { CreateStudentUserUseCase } from './domain/usecases/CreateStudentUserUseCase.js';
import { UpdateStudentUserUseCase } from './domain/usecases/UpdateStudentUserUseCase.js';
import { DeleteStudentUserUseCase } from './domain/usecases/DeleteStudentUserUseCase.js';
import { UpdateProfileUseCase } from './domain/usecases/UpdateProfileUseCase.js';
import { AuthController } from './application/controllers/AuthController.js';
import { UserController } from './application/controllers/UserController.js';
import { createAuthMiddlewares } from './application/middlewares/auth.middleware.js';
import { authRoutes } from './application/routes/auth.routes.js';
import { userRoutes } from './application/routes/user.routes.js';
import { IUserRepository } from './domain/ports/IUserRepository.js';

export interface BootstrapAuthOptions {
  connectMongo?: boolean;
  userRepo?: IUserRepository;
}

export async function bootstrapAuthServer(options: BootstrapAuthOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

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

  app.get('/health', async () => {
    return {
      service: 'estuda-anne-auth',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });

  let userRepo: IUserRepository;

  if (options.userRepo) {
    userRepo = options.userRepo;
  } else if (options.connectMongo !== false) {
    const mongo = MongoConnection.getInstance();
    const db = await mongo.connect();
    userRepo = new MongoUserRepository(db);

    const passwordHasher = new BcryptPasswordHasher();
    const seedAdminUseCase = new SeedAdminUserUseCase(userRepo, passwordHasher);
    const admin = await seedAdminUseCase.execute({
      adminEmail: env.ADMIN_EMAIL,
      adminPasswordText: env.ADMIN_PASSWORD,
      adminName: 'James (Admin Master)',
    });
    app.log.info({ adminId: admin.id, email: admin.email }, 'Usuário Admin semeado/verificado no MongoDB');
  } else {
    userRepo = new InMemoryUserRepository();
    const passwordHasher = new BcryptPasswordHasher();
    const seedAdminUseCase = new SeedAdminUserUseCase(userRepo, passwordHasher);
    await seedAdminUseCase.execute({
      adminEmail: env.ADMIN_EMAIL,
      adminPasswordText: env.ADMIN_PASSWORD,
      adminName: 'James (Admin Master)',
    });
  }

  const passwordHasher = new BcryptPasswordHasher();
  const tokenProvider = new JwtTokenProvider();

  // Use Cases
  const authenticateUseCase = new AuthenticateUserUseCase(userRepo, passwordHasher, tokenProvider);
  const createStudentUseCase = new CreateStudentUserUseCase(userRepo, passwordHasher);
  const updateStudentUseCase = new UpdateStudentUserUseCase(userRepo, passwordHasher);
  const deleteStudentUseCase = new DeleteStudentUserUseCase(userRepo);
  const updateProfileUseCase = new UpdateProfileUseCase(userRepo);

  // Controllers & Middlewares
  const authController = new AuthController(authenticateUseCase);
  const userController = new UserController(
    userRepo,
    createStudentUseCase,
    updateStudentUseCase,
    deleteStudentUseCase,
    updateProfileUseCase
  );
  const { authenticate, requireAdmin } = createAuthMiddlewares(tokenProvider);

  // Registro Obrigatório de Rotas
  await app.register(authRoutes, { prefix: '/auth', controller: authController });
  await app.register(userRoutes, { prefix: '/users', controller: userController, authenticate, requireAdmin });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrapAuthServer().then((app) => {
    const port = Number(process.env.AUTH_SERVICE_PORT) || 3005;
    app.listen({ port, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`Auth Service rodando em ${address}`);
    });
  });
}
