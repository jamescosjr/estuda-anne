import { existsSync } from 'node:fs';
import { FastifyInstance } from 'fastify';
import { DailyBriefingListener } from '../listeners/DailyBriefingListener.js';

function resolveStudyEngineUrl(): string {
  const url = (process.env.STUDY_ENGINE_URL || 'http://localhost:3002').replace(/\/$/, '');
  const inContainer = existsSync('/.dockerenv') || process.env.NODE_ENV === 'production';
  if (inContainer && /localhost|127\.0\.0\.1/.test(url)) {
    return url.replace(/localhost|127\.0\.0\.1/g, 'study-engine');
  }
  return url;
}

const STUDY_ENGINE_URL = resolveStudyEngineUrl();

async function readEngineJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 240) };
  }
}

function engineFetchError(err: unknown): { code?: string; message: string } {
  const cause = err && typeof err === 'object' ? (err as { cause?: { code?: string; message?: string } }).cause : undefined;
  const code = cause?.code || (err as { code?: string })?.code;
  const message = cause?.message || (err instanceof Error ? err.message : String(err));
  return { code, message };
}

function normalizeClientFormat(format: string): string {
  const value = (format || '').toUpperCase();
  if (value === 'PPTX') return 'PPT';
  if (value === 'MP4') return 'VIDEO';
  if (value === 'MP3') return 'AUDIO';
  if (['JPG', 'JPEG', 'PNG', 'WEBP', 'IMAGE'].includes(value)) return 'IMAGE';
  return value;
}

export async function studyRoutes(app: FastifyInstance) {
  const getMaterialsHandler = async (request: any, reply: any) => {
    const { studentId = 'anne-student-1' } = (request.query as any) || {};
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/materials?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          return reply.status(200).send([]);
        }
        return reply.status(res.status).send(await res.json());
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao listar materiais');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao listar materiais no Study Engine',
      });
    }
  };

  // Rota para listar materiais do estudante (Suporta /api/materials e /materials)
  app.get('/api/materials', getMaterialsHandler);
  app.get('/materials', getMaterialsHandler);

  const deleteMaterialHandler = async (request: any, reply: any) => {
    const { id } = request.params as any;
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/materials/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Erro ao deletar material' }));
        return reply.status(res.status).send(errJson);
      }
      const data = await res.json();
      return reply.status(200).send(data);
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao deletar material no Study Engine');
      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'Falha ao deletar material: ' + (err.message || String(err)),
      });
    }
  };

  app.delete('/api/materials/:id', deleteMaterialHandler);
  app.delete('/materials/:id', deleteMaterialHandler);

  const getMaterialByIdHandler = async (request: any, reply: any) => {
    const { id } = request.params as any;
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/materials/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Material não encontrado' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.send(await res.json());
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao consultar material no Study Engine');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao consultar material',
      });
    }
  };

  app.get('/api/materials/:id', getMaterialByIdHandler);
  app.get('/materials/:id', getMaterialByIdHandler);

  // Rota de Upload de Material (Suporta PDF, PPT, Áudio, Vídeo e Imagens JPG/PNG/WebP)
  app.post('/api/materials/upload', async (request, reply) => {
    const body = request.body as any;
    const { studentId = 'anne-student-1', title, subject, format, mimeType = 'text/plain', fileUrl, content, fileBase64, fileSizeBytes = 1024 } = body || {};

    if (!title || !format) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Campos obrigatórios ausentes: title, format',
      });
    }

    try {
      // 1. Registra o material no Study Engine
      const createRes = await fetch(`${STUDY_ENGINE_URL}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          title,
          subject,
          format: normalizeClientFormat(format),
          fileUrl: fileUrl || `https://r2.estuda-anne.local/${Date.now()}-${title}`,
          fileSizeBytes,
          mimeType,
          rawContent: typeof content === 'string' && content.trim().length > 10 ? content : undefined,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        return reply.status(createRes.status).send({ error: 'StudyEngineError', message: errText });
      }

      const material = await createRes.json() as any;

      // 2. Dispara o processamento com IA (Gemini 3.6 Flash) no Study Engine
      const processRes = await fetch(`${STUDY_ENGINE_URL}/materials/${material.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': String(request.headers['x-correlation-id'] || crypto.randomUUID()),
        },
        body: JSON.stringify({
          textContent: typeof content === 'string' && content.trim().length > 10 ? content : undefined,
          fileBase64,
          mimeType,
          fileName: title,
          async: true,
        }),
      });

      const processResult = await processRes.json().catch(() => null);
      if (processRes.status === 202) {
        return reply.status(202).send({
          message: 'Material registrado. Processamento em andamento',
          material: { ...material, status: 'PENDING' },
          processResult,
          status: 'PENDING',
        });
      }

      if (processRes.ok) {
        return reply.status(201).send({
          message: 'Material registrado e processado com sucesso',
          material: { ...material, status: processResult?.status || 'READY' },
          processResult,
          status: processResult?.status || 'READY',
        });
      }

      return reply.status(422).send({
        message: 'Material registrado, mas o processamento falhou',
        material: { ...material, status: 'FAILED' },
        processError: processResult,
        status: 'FAILED',
      });
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao comunicar com o Study Engine');
      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'Falha ao processar material no Study Engine: ' + (err.message || String(err)),
      });
    }
  });

  // Rota para consultar Flashcards Pendentes de Revisão Espaçada
  app.get('/api/flashcards/due', async (request, reply) => {
    const { studentId = 'anne-student-1', topic, allowedSubjects, subjects } = request.query as any;
    const context = DailyBriefingListener.getContext(studentId);
    const activeSubjects = allowedSubjects || subjects || (context?.subjects && context.subjects.length > 0 ? context.subjects : undefined);

    try {
      const dueUrl = new URL(`${STUDY_ENGINE_URL}/flashcards/due`);
      dueUrl.searchParams.set('studentId', studentId);
      if (topic && topic !== 'all') dueUrl.searchParams.set('topic', String(topic));
      if (activeSubjects) {
        const value = Array.isArray(activeSubjects) ? activeSubjects.join(',') : String(activeSubjects);
        if (value) dueUrl.searchParams.set('allowedSubjects', value);
      }
      const res = await fetch(dueUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao listar flashcards' }));
        return reply.status(res.status).send(errJson);
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Rota para submeter nota de revisão de Flashcard (SM-2 Algorithm)
  app.post('/api/flashcards/:id/review', async (request, reply) => {
    const { id } = request.params as any;
    const { rating, grade } = request.body as any;
    const sm2Grade = grade ?? rating;

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/flashcards/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: sm2Grade, rating: sm2Grade }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao revisar flashcard' }));
        return reply.status(res.status).send(errJson);
      }
      const data = await res.json();
      return reply.send(data);
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Rota para Gerar Sessão Extra de Flashcards (reavalia perfil e gera novos flashcards persistidos)
  app.post('/api/flashcards/extra-session', async (request, reply) => {
    const { studentId = 'anne-student-1', subjectId, topic, allowedSubjects, subjects, count, excludeIds } = (request.body as any) || {};
    const context = DailyBriefingListener.getContext(studentId);
    const activeSubjects = allowedSubjects || subjects || (context?.subjects && context.subjects.length > 0 ? context.subjects : undefined);

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/flashcards/extra-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subjectId, topic, allowedSubjects: activeSubjects, count, excludeIds }),
        signal: AbortSignal.timeout(180_000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao gerar sessão extra de flashcards' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.send(await res.json());
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // Rota de Encerramento de Semestre (Rotina de Cleanup em lote)
  app.post('/api/semesters/close', async (request, reply) => {
    const { studentId } = (request.body as any) || {};

    if (!studentId) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'studentId é obrigatório para encerrar o semestre',
      });
    }

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/semesters/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Erro ao encerrar semestre' }));
        return reply.status(res.status).send(errJson);
      }

      return reply.status(200).send(await res.json());
    } catch (err: any) {
      app.log.error({ err }, 'Erro ao encerrar semestre no Study Engine');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao encerrar semestre',
      });
    }
  });

  app.get('/api/study/engine-health', async (_request, reply) => {
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/health`, { signal: AbortSignal.timeout(4000) });
      return reply.status(res.status).send(await readEngineJson(res));
    } catch (err: unknown) {
      const detail = engineFetchError(err);
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        studyEngineUrl: STUDY_ENGINE_URL,
        detail: detail.code || detail.message,
      });
    }
  });
  app.post('/api/study/schedule/generate', async (request, reply) => {
    const { studentId = 'anne-student-1', title = 'Plano do Semestre', subjects = [], targetExamDate, dailyStudyMinutesTarget = 45, periodStartDate, periodEndDate, examDates } = (request.body as any) || {};

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          title,
          subjects,
          targetExamDate,
          dailyStudyMinutesTarget,
          periodStartDate,
          periodEndDate,
          examDates,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data = await readEngineJson(res);
        return reply.status(200).send(data);
      }

      const errJson = await readEngineJson(res);
      if (res.status === 404) {
        return reply.status(503).send({
          error: 'StudyEngineUnavailable',
          message: 'Falha ao gerar cronograma no Study Engine',
          detail: 'Study Engine ainda nao registrou /schedule/generate',
        });
      }
      return reply.status(res.status).send(errJson);
    } catch (err: any) {
      const detail = engineFetchError(err);
      app.log.warn({
        err,
        cause: err?.cause,
        studyEngineUrl: STUDY_ENGINE_URL,
        detail,
      }, 'Study Engine offline ao gerar cronograma');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao gerar cronograma no Study Engine',
        detail: detail.code || detail.message,
      });
    }
  });

  app.get('/api/study/schedule', async (request, reply) => {
    const { studentId = 'anne-student-1' } = (request.query as any) || {};
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/schedule?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Cronograma não encontrado' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.status(200).send(await res.json());
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao carregar cronograma');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao carregar cronograma',
      });
    }
  });

  app.post('/api/study/schedule/items/:itemId/complete', async (request, reply) => {
    const { itemId } = request.params as any;
    const { studentId = 'anne-student-1' } = (request.body as any) || {};
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/schedule/items/${encodeURIComponent(itemId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao concluir item do plano' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.status(200).send(await res.json());
    } catch (err: any) {
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao concluir item do plano',
      });
    }
  });

  // Rota para Análise Multimodal de Imagem/Arquivo de Cronograma com Gemini 3.6 Flash
  app.post('/api/study/schedule/analyze-file', async (request, reply) => {
    const { studentId, fileBase64, fileName, mimeType = 'image/png', textContent } = (request.body as any) || {};

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/schedule/analyze-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          fileBase64,
          fileName,
          mimeType,
          textContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return reply.status(200).send(data);
      }

      const errJson = await res.json().catch(() => ({ message: 'Falha ao analisar arquivo de cronograma' }));
      return reply.status(res.status).send(errJson);
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao analisar arquivo de cronograma');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao analisar o arquivo. Preencha o cronograma manualmente.',
      });
    }
  });

  // Rota de Feedback da IA do Estudante (Active Learning)
  app.post('/api/feedback', async (request, reply) => {
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      if (res.ok) {
        return reply.status(201).send(await res.json());
      }
      const errJson = await res.json().catch(() => ({ message: 'Falha ao gravar feedback' }));
      return reply.status(res.status).send(errJson);
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao gravar feedback');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao gravar feedback no Study Engine',
      });
    }
  });

  app.get('/api/feedback/summary', async (request, reply) => {
    const { studentId = 'anne-student-1' } = (request.query as any) || {};
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/feedback/summary?studentId=${encodeURIComponent(studentId)}`);
      if (res.ok) {
        return reply.status(200).send(await res.json());
      }
      const errJson = await res.json().catch(() => ({ message: 'Falha ao consultar feedback' }));
      return reply.status(res.status).send(errJson);
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao consultar feedback');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao consultar feedback',
      });
    }
  });

  // Rota SSE de Streaming para o Briefing Diário de Boas-vindas Inteligente
  app.get('/api/daily-briefing', async (request, reply) => {
    const { studentId = 'anne-student-1', name = 'Anne' } = (request.query as any) || {};

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    let dueCount = 0;
    let events: string[] = [];
    let studentSubjects: string[] = [];

    const context = DailyBriefingListener.getContext(studentId);
    const studentName = name || context?.studentName || 'Estudante';
    const profileSubjects = context?.subjects || [];

    // 1. Busca dinamicamente os materiais do aluno para obter as matérias reais
    try {
      const matRes = await fetch(`${STUDY_ENGINE_URL}/materials?studentId=${encodeURIComponent(studentId)}`);
      if (matRes.ok) {
        const materials = (await matRes.json()) as any[];
        if (Array.isArray(materials) && materials.length > 0) {
          studentSubjects = Array.from(
            new Set(materials.map((m: any) => m.subject || m.tags?.[0]).filter(Boolean))
          );
        }
      }
    } catch {
      // Ignora erro de rede ao buscar materiais
    }

    // 2. Busca dinamicamente a contagem de flashcards pendentes do aluno considerando allowedSubjects do perfil
    try {
      const dueParams = new URLSearchParams({ studentId });
      if (profileSubjects.length > 0) {
        dueParams.set('allowedSubjects', profileSubjects.join(','));
      }
      const dueRes = await fetch(`${STUDY_ENGINE_URL}/flashcards/due?${dueParams.toString()}`);
      if (dueRes.ok) {
        const dueCards = (await dueRes.json()) as any[];
        if (Array.isArray(dueCards)) {
          dueCount = dueCards.length;
        }
      }
    } catch {
      // Ignora erro de rede ao buscar flashcards
    }

    let activeSubjects: string[] = [];
    if (profileSubjects.length > 0) {
      activeSubjects = studentSubjects.filter((s) =>
        profileSubjects.some(
          (p) => p.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(s.toLowerCase())
        )
      );
      if (activeSubjects.length === 0) {
        activeSubjects = profileSubjects;
      }
    } else {
      activeSubjects = studentSubjects;
    }

    if (activeSubjects.length > 0) {
      events = activeSubjects.map((s) => `Revisão de ${s}`);
    } else {
      events = [];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let briefingText = '';

    if (apiKey) {
      try {
        const prompt =
          events.length > 0 || dueCount > 0
            ? `Você é um mentor universitário especialista e empático para a pessoa estudante ${studentName}.
Gere um briefing matinal curto (máximo 2 a 3 frases) de boas-vindas para o dashboard de estudos.

DADOS REAIS DA ESTUDANTE:
- Nome: ${studentName}
- Flashcards pendentes hoje: ${dueCount}
- Matérias/Atividades cadastradas: ${events.join(', ')}

REGRAS RÍGIDAS:
- Mencione APENAS as matérias listadas acima (${events.join(', ')}).
- NUNCA mencione matérias que não estejam na lista acima (como Cálculo I, Algoritmos, Fundamentos de IA, LLMs para Programadores, etc.).
- Destaque o estudo ativo e a retenção em blocos curtos.`
            : `Você é um mentor universitário especialista e empático para a pessoa estudante ${studentName}.
Gere um briefing matinal curto (máximo 2 a 3 frases) de boas-vindas para o dashboard de estudos.

DADOS REAIS DA ESTUDANTE:
- Nome: ${studentName}
- O(a) estudante ainda não cadastrou materiais nem possui matérias ativas cadastradas.

REGRAS RÍGIDAS:
- Dê boas-vindas calorosas e encorajadoras.
- Convide o(a) estudante a fazer o upload do seu primeiro material de estudo (PDF, anotação ou resumo) para gerar flashcards e conteúdos inteligentes.
- NUNCA mencione matérias fictícias (como Cálculo I, Algoritmos, Fundamentos de IA, LLMs para Programadores, etc.).`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.6 },
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          briefingText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (err) {
        app.log.warn({ err }, 'Erro ao gerar briefing no Gemini, usando fallback de streaming local');
      }
    }

    if (!briefingText) {
      if (events.length > 0 || dueCount > 0) {
        const activityDesc = events.length > 0 ? events.slice(0, 2).join(' e ') : 'suas revisões espaçadas';
        briefingText = `Oi ${studentName}, bom dia! Você tem ${dueCount} flashcard(s) pendente(s) e ${activityDesc} para hoje. Bom estudo!`;
      } else {
        briefingText = `Oi ${studentName}, bom dia! Seu ambiente de estudos está pronto. Adicione seu primeiro material para gerar resumos e flashcards automáticos!`;
      }
    }

    const words = briefingText.split(' ');
    for (const word of words) {
      const chunk = word + ' ';
      reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      await new Promise((r) => setTimeout(r, 30));
    }

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  });

  app.get('/api/quizzes/session', async (request, reply) => {
    const { studentId = 'anne-student-1', topic, allowedSubjects, subjects, count } = request.query as any;
    const activeSubjects = allowedSubjects || subjects;

    try {
      const params = new URLSearchParams({ studentId: String(studentId) });
      if (topic) params.set('topic', String(topic));
      if (count) params.set('count', String(count));
      if (activeSubjects) {
        const value = Array.isArray(activeSubjects) ? activeSubjects.join(',') : String(activeSubjects);
        if (value) params.set('allowedSubjects', value);
      }
      const res = await fetch(`${STUDY_ENGINE_URL}/quizzes/session?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao montar sessão de quiz' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.send(await res.json());
    } catch (err: any) {
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao montar sessão de quiz',
      });
    }
  });

  app.get('/api/quizzes', async (request, reply) => {
    const { studentId = 'anne-student-1' } = request.query as any;
    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/quizzes?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao listar quizzes' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.send(await res.json());
    } catch (err: any) {
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao listar quizzes',
      });
    }
  });

  // Rota de Avaliação de Quiz com Recálculo de Pesos por Tópico e Diagnóstico Adaptativo
  app.post('/api/quizzes/:id/evaluate', async (request, reply) => {
    const { id } = request.params as any;
    const { studentId = 'anne-student-1', answers = [] } = (request.body as any) || {};

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/quizzes/${encodeURIComponent(id)}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, answers }),
      });

      if (res.ok) {
        return reply.status(200).send(await res.json());
      }

      const errJson = await res.json().catch(() => ({ message: 'Falha ao avaliar quiz' }));
      return reply.status(res.status).send(errJson);
    } catch (err: any) {
      app.log.warn({ err }, 'Study Engine offline ao avaliar quiz');
      return reply.status(503).send({
        error: 'StudyEngineUnavailable',
        message: 'Falha ao avaliar quiz no Study Engine',
      });
    }
  });

  // Rota para Gerar Sessão Extra de Quizzes (reavalia perfil e gera novas questões direcionadas)
  app.post('/api/quizzes/extra-session', async (request, reply) => {
    const { studentId = 'anne-student-1', subjectId, topic, allowedSubjects, subjects, count, excludeIds } = (request.body as any) || {};
    const activeSubjects = allowedSubjects || subjects;

    try {
      const res = await fetch(`${STUDY_ENGINE_URL}/quizzes/extra-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subjectId, topic, allowedSubjects: activeSubjects, count, excludeIds }),
        signal: AbortSignal.timeout(180_000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Falha ao gerar sessão extra de quizzes' }));
        return reply.status(res.status).send(errJson);
      }
      return reply.send(await res.json());
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });
}
