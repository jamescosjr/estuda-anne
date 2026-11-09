import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { bootstrapAuthServer } from '../src/index.js';
import { IUserRepository, User } from '../src/domain/index.js';
import { JwtTokenProvider } from '../src/infrastructure/security/JwtTokenProvider.js';

class MockRepo implements IUserRepository {
  async findByEmail() { return null; }
  async findById() { return null; }
  async save() {}
  async update() {}
  async delete() {}
  async findAllStudents() { return []; }
  async findStudentsPaginated() {
    return {
      students: [
        new User({ id: 'usr-1', name: 'Anne Student', email: 'anne@test.com', passwordHash: 'hash', role: 'STUDENT' }),
      ],
      total: 1,
      page: 1,
      limit: 5,
      totalPages: 1,
    };
  }
}

describe('UserController HTTP Routes', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapAuthServer({ userRepo: new MockRepo() });
    const tokenProvider = new JwtTokenProvider();
    adminToken = tokenProvider.generateToken({
      userId: 'usr-admin',
      email: 'james@estuda-anne.com',
      role: 'ADMIN',
    });
  });

  it('deve responder 200 à rota /users/students com query params quando autenticado como Admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/students?page=1&limit=5',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.students).toHaveLength(1);
    expect(body.students[0].name).toBe('Anne Student');
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(5);
  });

  it('deve responder 401 com MISSING_AUTH_HEADER ao atualizar perfil sem cabeçalho Authorization', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/profile',
      payload: { subjects: ['Fisiologia'] },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      error: 'Unauthorized',
      code: 'MISSING_AUTH_HEADER',
      reason: 'missing_authorization_header',
    });
  });

  it('deve responder 401 com MALFORMED_AUTH_HEADER quando Authorization não começa com Bearer', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/profile',
      headers: {
        authorization: 'Basic token-invalido',
      },
      payload: { subjects: ['Fisiologia'] },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      error: 'Unauthorized',
      code: 'MALFORMED_AUTH_HEADER',
      reason: 'malformed_authorization_header',
    });
  });

  it('deve responder 401 com INVALID_TOKEN quando o token enviado é inválido ou de sessão demo', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/profile',
      headers: {
        authorization: 'Bearer demo-token-student',
      },
      payload: { subjects: ['Fisiologia'] },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      reason: 'invalid_token',
    });
  });
});
