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
});
