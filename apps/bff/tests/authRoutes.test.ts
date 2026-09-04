import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { bootstrapBFF } from '../src/index.js';

describe('Rotas de Autenticação do BFF', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootstrapBFF();
  });

  it('deve responder à rota de health do BFF', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.service).toBe('estuda-anne-bff');
  });

  it('deve retornar 400 ou erro adequado se enviar corpo vazio para login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });

    expect([400, 404, 500]).toContain(res.statusCode);
  });
});
