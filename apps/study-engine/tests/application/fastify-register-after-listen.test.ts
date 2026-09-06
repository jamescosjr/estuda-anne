import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { materialRoutes } from '../../src/application/routes/material.routes.js';

describe('Fastify plugin registration', () => {
  it('nao permite registrar rotas depois do listen', async () => {
    const app = Fastify({ logger: false });
    app.get('/health', async () => ({ ok: true }));
    await app.listen({ port: 0, host: '127.0.0.1' });

    expect(() => {
      void app.register(async (instance) => {
        instance.post('/schedule/generate', async () => ({ ok: true }));
      });
    }).toThrow(/already booted/);

    await app.close();
  });

  it('aceita registrar rotas antes do listen', async () => {
    const app = Fastify({ logger: false });
    await app.register(async (instance) => {
      instance.post('/schedule/generate', async () => ({ ok: true }));
    });
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/schedule/generate' });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});

describe('materialRoutes', () => {
  it('nao declara POST /materials duas vezes com ignoreTrailingSlash', async () => {
    const app = Fastify({ logger: false, ignoreTrailingSlash: true });
    const controller = {
      create: async (_req: unknown, reply: { status: (code: number) => { send: (body: unknown) => void } }) => {
        reply.status(201).send({ ok: true });
      },
      getByStudentId: async () => {},
      getById: async () => {},
      process: async () => {},
      delete: async () => {},
    };

    await app.register(materialRoutes, { prefix: '/materials', controller: controller as never });
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/materials' });
    expect(response.statusCode).toBe(201);
    await app.close();
  });
});
