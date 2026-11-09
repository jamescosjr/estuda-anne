import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { bootstrapBFF } from '../src/index.js';

describe('BFF studyRoutes - Resiliência de Timeouts nas Rotas de Materiais', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootstrapBFF();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('REQ_05_WHEN_bff_chamar_study_engine_nas_rotas_de_materiais_SHALL_aplicar_abort_signal_timeout', async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    const mockFetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });

      if (url.endsWith('/materials') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'mat-123', title: 'Apostila', status: 'PENDING' }),
          text: async () => JSON.stringify({ id: 'mat-123', title: 'Apostila', status: 'PENDING' }),
        };
      }

      if (url.endsWith('/materials/mat-123/process') && init?.method === 'POST') {
        return {
          ok: true,
          status: 202,
          json: async () => ({ status: 'PENDING', jobId: 'job-1' }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => [{ id: 'mat-123', title: 'Apostila', status: 'READY' }],
      };
    });

    vi.stubGlobal('fetch', mockFetch);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/materials?studentId=anne-student-1',
    });
    expect(listRes.statusCode).toBe(200);

    const getByIdRes = await app.inject({
      method: 'GET',
      url: '/api/materials/mat-123',
    });
    expect(getByIdRes.statusCode).toBe(200);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/api/materials/mat-123',
    });
    expect(deleteRes.statusCode).toBe(200);

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/materials/upload',
      payload: {
        studentId: 'anne-student-1',
        title: 'Apostila',
        format: 'PDF',
        content: 'Conteudo suficientemente longo para registro.',
      },
    });
    expect(uploadRes.statusCode).toBe(202);

    expect(fetchCalls).toHaveLength(5);
    for (const call of fetchCalls) {
      expect(call.init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('REQ_05_IF_study_engine_exceder_timeout_ao_consultar_ou_deletar_material_SHALL_retornar_erro_tratado', async () => {
    const timeoutErr = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    const mockFetch = vi.fn().mockRejectedValue(timeoutErr);
    vi.stubGlobal('fetch', mockFetch);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/materials?studentId=anne-student-1',
    });
    expect(listRes.statusCode).toBe(503);
    expect(listRes.json().error).toBe('StudyEngineUnavailable');

    const getByIdRes = await app.inject({
      method: 'GET',
      url: '/api/materials/mat-timeout',
    });
    expect(getByIdRes.statusCode).toBe(503);
    expect(getByIdRes.json().error).toBe('StudyEngineUnavailable');

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/api/materials/mat-timeout',
    });
    expect(deleteRes.statusCode).toBe(500);
    expect(deleteRes.json().error).toBe('InternalServerError');
  });
});
