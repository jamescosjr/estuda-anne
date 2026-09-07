import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiFlashAdapter } from '../../src/infrastructure/ai/GeminiFlashAdapter.js';

describe('GeminiFlashAdapter - Refatoração Pedagógica de IA', () => {
  const sampleMaterial = `O Algoritmo de Dijkstra encontra o caminho mais curto de um nó de origem a todos os outros nós em um grafo ponderado com pesos não negativos. Ele utiliza uma fila de prioridade para selecionar gananciosamente o nó não visitado com a menor distância provisória.`;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('Fallback Offline (Sem chave de API)', () => {
    it('deve gerar flashcards atômicos alinhados ao Princípio da Informação Mínima', async () => {
      const adapter = new GeminiFlashAdapter('');
      const flashcards = await adapter.generateFlashcards(sampleMaterial, 3);

      expect(flashcards.length).toBeGreaterThan(0);
      for (const card of flashcards) {
        expect(card.front).toBeDefined();
        expect(card.back).toBeDefined();
        // Garante que o verso não exceda 2 frases curtas / parágrafos gigantes
        const sentences = card.back.split(/[.!?]+/).filter(s => s.trim().length > 0);
        expect(sentences.length).toBeLessThanOrEqual(3);
      }
    });

    it('deve gerar quizzes no nível de aplicação com explicação estruturada', async () => {
      const adapter = new GeminiFlashAdapter('');
      const quiz = await adapter.generateQuizQuestions(sampleMaterial, 2);

      expect(quiz.length).toBe(2);
      for (const q of quiz) {
        expect(q.prompt).toContain('Segundo o material');
        expect(q.prompt.toLowerCase()).not.toContain('anne');
        expect(q.options.length).toBe(4);
        expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswerIndex).toBeLessThanOrEqual(3);
        expect(q.explanation).toBeTruthy();
      }
    });
  });

  describe('Chamada Online com Gemini API (Mock de Fetch)', () => {
    const mockApiKey = 'test-gemini-key-123';

    it('deve enviar prompt com Princípio da Informação Mínima e temperature: 0.6 para Flashcards', async () => {
      let capturedRequestBody: any = null;

      const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedRequestBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          front: 'Qual a pré-condição dos pesos no algoritmo de Dijkstra?',
                          back: 'Os pesos das arestas devem ser estritamente não negativos. Pesos negativos causam loops infinitos.',
                        },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      vi.stubGlobal('fetch', mockFetch);

      const adapter = new GeminiFlashAdapter(mockApiKey);
      const cards = await adapter.generateFlashcards(sampleMaterial, 1);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(capturedRequestBody.generationConfig.temperature).toBe(0.6);
      expect(capturedRequestBody.generationConfig.responseMimeType).toBe('application/json');

      const promptText = capturedRequestBody.contents[0].parts[0].text;
      expect(promptText).toContain('Você é um tutor universitário');
      expect(promptText).toContain('UM conceito');
      expect(promptText).toContain('MATERIAL BASE:');
      expect(promptText).toContain('NÃO mencione a aluna Anne');

      expect(cards.length).toBe(1);
      expect(cards[0].front).toBe('Qual a pré-condição dos pesos no algoritmo de Dijkstra?');
    });

    it('deve enviar prompt com Taxonomia de Bloom, temperature: 0.6 e mapear a propriedade explicacao nos Quizzes', async () => {
      let capturedRequestBody: any = null;

      const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedRequestBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          prompt: 'Anne precisa implementar um sistema de navegação por GPS e os pesos das rotas representam tempo em minutos. Qual algoritmo ela deve escolher?',
                          options: [
                            'Dijkstra, pois os tempos são valores não negativos.',
                            'Bellman-Ford, pois é o único capaz de lidar com matrizes esparsas.',
                            'Busca em Largura pura, pois ignora pesos nas arestas.',
                            'Algoritmo de Prim, pois gera uma árvore geradora mínima.',
                          ],
                          correctAnswerIndex: 0,
                          explicacao: 'A opção 0 é a correta pois os tempos são não negativos. A opção 3 está incorreta pois Prim calcula MST, não o caminho mínimo a partir da origem.',
                        },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      vi.stubGlobal('fetch', mockFetch);

      const adapter = new GeminiFlashAdapter(mockApiKey);
      const quiz = await adapter.generateQuizQuestions(sampleMaterial, 1);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(capturedRequestBody.generationConfig.temperature).toBe(0.6);

      const promptText = capturedRequestBody.contents[0].parts[0].text;
      expect(promptText).toContain('recordação/compreensão');
      expect(promptText).toContain('explicacao');
      expect(promptText).toContain('NÃO é o tema das perguntas');
      expect(promptText.toLowerCase()).toContain('metadados');

      expect(quiz.length).toBe(1);
      expect(quiz[0].explanation).toBe(
        'A opção 0 é a correta pois os tempos são não negativos. A opção 3 está incorreta pois Prim calcula MST, não o caminho mínimo a partir da origem.'
      );
    });

    it('retenta generateContent ate 3 vezes em 503 com backoff exponencial', async () => {
      vi.useFakeTimers();
      const successBody = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { front: 'O que e Dijkstra?', back: 'Caminho minimo com pesos nao negativos.' },
                  ]),
                },
              ],
            },
          },
        ],
      };

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => successBody,
        });

      vi.stubGlobal('fetch', mockFetch);
      const adapter = new GeminiFlashAdapter(mockApiKey);
      const pending = adapter.generateFlashcards(sampleMaterial, 1);
      const cards = await vi.runAllTimersAsync().then(() => pending);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(cards[0].front).toBe('O que e Dijkstra?');
      vi.useRealTimers();
    });

    it('nao retenta erros 400 permanentes', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });
      vi.stubGlobal('fetch', mockFetch);
      const adapter = new GeminiFlashAdapter(mockApiKey);

      await expect(adapter.generateFlashcards(sampleMaterial, 1)).rejects.toThrow(/400/);
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });
});
