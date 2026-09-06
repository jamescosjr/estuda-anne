import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';

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
