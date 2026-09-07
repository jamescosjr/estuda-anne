import {
  ILanguageModelService,
  MaterialAnalysisResult,
  GeneratedFlashcardDTO,
  GeneratedQuizQuestionDTO,
  ParsedScheduleAnalysisResult,
} from '../../domain/ports/ILanguageModelService.js';
import { env } from '../config/env.js';
import { logStructured } from '../observability/structuredLog.js';

export const GEMINI_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 1000,
} as const;

function isRetryableGeminiStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geminiFetch(url: string, init: RequestInit, operation = 'gemini_generate'): Promise<Response> {
  let lastError: unknown;
  const timeoutMs = 25000;
  const body = init.body;
  const headers = init.headers;

  for (let attempt = 1; attempt <= GEMINI_RETRY.maxAttempts; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: init.method,
        headers,
        body,
        signal: controller.signal,
      });
      const retryable = !response.ok && isRetryableGeminiStatus(response.status);
      logStructured({
        service: 'study-engine',
        event: 'gemini_call',
        operation,
        status: response.status,
        durationMs: Date.now() - started,
        ok: response.ok,
        attempt,
      });

      if (!retryable || attempt === GEMINI_RETRY.maxAttempts) {
        return response;
      }

      await sleep(GEMINI_RETRY.baseDelayMs * 2 ** (attempt - 1));
    } catch (error) {
      lastError = error;
      logStructured({
        service: 'study-engine',
        event: 'gemini_call',
        operation,
        durationMs: Date.now() - started,
        ok: false,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt === GEMINI_RETRY.maxAttempts) {
        throw error;
      }
      await sleep(GEMINI_RETRY.baseDelayMs * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini Flash API unavailable');
}

export class GeminiFlashAdapter implements ILanguageModelService {
  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = env.GEMINI_API_KEY) {
    this.apiKey = apiKey;
  }

  public async extractConceptsAndSummary(content: string): Promise<MaterialAnalysisResult> {
    if (!this.apiKey) {
      // Fallback determinístico para desenvolvimento e testes locais de baixo custo
      const sampleSentences = content.split('.').filter(s => s.trim().length > 10);
      const summary = sampleSentences.slice(0, 3).join('. ').trim() || 'Resumo inicial gerado automaticamente.';
      const keyConcepts = Array.from(
        new Set(
          content
            .split(/\s+/)
            .filter(word => word.length > 6)
            .map(w => w.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase())
        )
      ).slice(0, 5);

      return {
        summary: `Resumo do material: ${summary}.`,
        keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['conceito principal', 'fundamentos'],
      };
    }

    // Chamada HTTP otimizada para o Gemini Flash via API REST (baixo overhead, sem sdk pesado)
    const prompt = `Você é um coordenador pedagógico especialista em microlearning.
Analise o seguinte material de estudo universitário.
Ignore metadados de arquivo (autor, CreationDate, datas ISO/Node, nome do PDF).

REGRAS DE QUALIDADE:
- Resumo estruturado e conciso dos CONCEITOS da matéria (não da aluna).
- Até 5 conceitos-chave essenciais, priorizando os que mais caem em prova.
- Evite jargões desnecessários.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.

Formato esperado:
{"summary": "...", "keyConcepts": ["..."]}

Material:
${content.slice(0, 10000)}`;

    const response = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Flash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textOutput);

    return {
      summary: parsed.summary,
      keyConcepts: parsed.keyConcepts ?? [],
    };
  }

  public async generateFlashcards(
    content: string,
    count = 5,
    existingPrompts?: string[],
    focusTopics?: Array<{ topic: string; priorityWeight: number }>
  ): Promise<GeneratedFlashcardDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
      const cards: GeneratedFlashcardDTO[] = [];
      const distinctTopics = Array.from(new Set(sentences));

      const existingSet = new Set((existingPrompts || []).map(p => p.trim().toLowerCase()));

      for (let i = 0; i < Math.min(count, Math.max(3, distinctTopics.length)); i++) {
        const topic = distinctTopics[i] || `Conceito fundamental ${i + 1}`;
        const front = `[Gatilho] O que caracteriza: ${topic.slice(0, 45)}?`;
        if (existingSet.has(front.toLowerCase())) continue;

        cards.push({
          front,
          back: `Refere-se ao conceito chave de ${topic.slice(0, 40)}. Garante a compreensão atômica e retenção do conteúdo.`,
        });
      }

      return cards.length > 0 ? cards : [
        {
          front: 'Qual a definição atômica do conceito principal?',
          back: content.slice(0, 100).trim() + '.',
        },
        {
          front: 'Como aplicar este fundamento na prática?',
          back: 'Relacionando os axiomas teóricos com resolução ativa de problemas.',
        },
        {
          front: 'Qual o ponto crítico de diferenciação entre os modelos?',
          back: 'A abrangência analítica e a eficiência no diagnóstico de resultados.',
        },
      ];
    }

    const prohibitionBlock = existingPrompts && existingPrompts.length > 0
      ? `\nPROIBIÇÃO DE REPETIÇÃO (REGRA ABSOLUTA):\nNUNCA crie flashcards com enunciados ou conceitos iguais/semelhantes aos seguintes cards já respondidos pela aluna:\n${existingPrompts.slice(0, 25).map(p => `- "${p}"`).join('\n')}\n`
      : '';

    const focusBlock = focusTopics && focusTopics.length > 0
      ? `\nDIRECIONAMENTO DE PESOS POR TÓPICO:\nPriorize (60% de foco) os tópicos com maior taxa de erro recente:\n${focusTopics.map(t => `- Tópico: ${t.topic} (Peso de prioridade: ${t.priorityWeight})`).join('\n')}\nMantenha 40% de cobertura proporcional do restante do material.\n`
      : '';

    const prompt = `Você é um coordenador pedagógico especialista em microlearning. Gere flashcards para estudar o CONTEÚDO da matéria, não o documento.

REGRAS DE QUALIDADE:
1. Os flashcards devem ter perguntas curtas e instigantes.
2. A resposta deve ser direta e em tópicos se necessário.
3. Evite jargões desnecessários.
4. Cada card foca UM conceito da disciplina (definição, mecanismo, comparação ou uso).
5. Frente = gatilho de memória. Verso = no máximo 2 frases ou tópicos curtos.
6. NÃO mencione a aluna Anne. NÃO pergunte autor, data, metadados, formato de arquivo ou nome do PDF.
7. Priorize conceitos-chave (maior peso), mas cubra o restante do material.

MATERIAL BASE:
${content.slice(0, 10000)}
${prohibitionBlock}${focusBlock}
TAREFA:
Gere ${count} flashcards inéditos com base estritamente nos conceitos da matéria.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.
[
  {
    "front": "...",
    "back": "..."
  }
]`;

    const response = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Flash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(textOutput);
  }

  public async generateQuizQuestions(
    content: string,
    questionsCount = 4,
    existingPrompts?: string[],
    focusTopics?: Array<{ topic: string; priorityWeight: number }>
  ): Promise<GeneratedQuizQuestionDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const questions: GeneratedQuizQuestionDTO[] = [];

      for (let i = 0; i < questionsCount; i++) {
        const sentence = sentences[i % sentences.length] || `tópico de aplicação acadêmica ${i + 1}`;
        questions.push({
          prompt: `Segundo o material, o que é correto sobre: "${sentence.slice(0, 80)}"?`,
          options: [
            `A afirmação descreve um fundamento do conteúdo: ${sentence.slice(0, 40)}.`,
            `Ignorar o contexto inicial e utilizar uma aproximação empírica genérica.`,
            `Confundir a hipótese de partida com o resultado de amostragem secundário.`,
            `Desconsiderar as restrições operacionais e atuar apenas no escopo teórico.`,
          ],
          correctAnswerIndex: 0,
          explanation: `A alternativa correta aplica diretamente os princípios de ${sentence.slice(0, 30)}. A segunda opção é incorreta pois desconsidera o rigor técnico necessário no cenário.`,
        });
      }

      return questions;
    }

    const prohibitionBlock = existingPrompts && existingPrompts.length > 0
      ? `\nPROIBIÇÃO DE REPETIÇÃO (REGRA ABSOLUTA):\nNUNCA crie perguntas iguais ou com enunciados parecidos/variações simples das seguintes perguntas já respondidas pela aluna:\n${existingPrompts.slice(0, 25).map(p => `- "${p}"`).join('\n')}\n`
      : '';

    const focusBlock = focusTopics && focusTopics.length > 0
      ? `\nDIRECIONAMENTO DE PESOS POR TÓPICO:\nPriorize (60% das questões) os tópicos de maior fragilidade/erro recente:\n${focusTopics.map(t => `- Tópico: ${t.topic} (Peso de prioridade: ${t.priorityWeight})`).join('\n')}\nMantenha 40% de cobertura proporcional do restante do material.\n`
      : '';

    const prompt = `Você é um coordenador pedagógico especialista em microlearning. Gere questões de prova sobre o CONTEÚDO da matéria. A audiência é uma estudante, mas ela NÃO é o tema das perguntas.

REGRAS DE QUALIDADE:
1. As perguntas devem ser curtas e instigantes.
2. Evite jargões desnecessários.
3. Alternativas incorretas devem ser confusões reais da disciplina.
4. Inclua "explicacao" dizendo por que a correta está certa e por que a distratora mais plausível erra.

MATERIAL BASE:
${content.slice(0, 10000)}
${prohibitionBlock}${focusBlock}
TAREFA:
Gere ${questionsCount} questões de múltipla escolha inéditas, cobrindo o material.

DISTRIBUIÇÃO (abordar tudo, com foco no que mais importa):
- ~50% recordação/compreensão dos conceitos-chave (definições, mecanismos, fatos da disciplina).
- ~30% aplicação (usar o conceito em um problema da matéria).
- ~20% análise (comparar modelos, causas, limitações).
Se houver tópicos com peso maior, concentre ~60% neles e mantenha ~40% no restante.

PROIBIDO:
- Mencionar "Anne", a aluna, ou transformar a estudante em personagem do enunciado.
- Perguntar sobre autor, data, CreationDate, ISO/Node date, metadados ou estrutura do arquivo.
- Interpretação de uma linha isolada de cabeçalho/rodapé.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.
[
  {
    "prompt": "...",
    "options": ["opcao 0", "opcao 1", "opcao 2", "opcao 3"],
    "correctAnswerIndex": 0,
    "explicacao": "..."
  }
]`;

    const response = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Flash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textOutput);

    return parsed.map((item: any) => ({
      prompt: item.prompt,
      options: item.options,
      correctAnswerIndex: item.correctAnswerIndex,
      explanation: item.explanation ?? item.explicacao ?? '',
    }));
  }

  public async analyzeScheduleImageOrDocument(fileData: {
    mimeType?: string;
    dataBase64?: string;
    textContent?: string;
  }): Promise<ParsedScheduleAnalysisResult> {
    if (!this.apiKey) {
      // Fallback inteligente para desenvolvimento/offline
      const text = fileData.textContent || '';
      return {
        periodStartDate: new Date().toISOString().split('T')[0],
        periodEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subjects: ['Cálculo I', 'Algoritmos e Estruturas de Dados', 'Engenharia de Software'],
        examDates: [
          { subject: 'Cálculo I', title: 'Prova P1 (Derivadas)', date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { subject: 'Algoritmos e Estruturas de Dados', title: 'Trabalho Prático 1', date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ],
        suggestedScheduleEvents: [
          { day: 'Seg', date: 'Segunda', title: 'Revisão espaçada — Cálculo I', subject: 'Cálculo I', type: 'flashcards', time: '18:00' },
          { day: 'Ter', date: 'Terça', title: 'Quiz — Algoritmos', subject: 'Algoritmos e Estruturas de Dados', type: 'quiz', time: '19:30' },
        ],
      };
    }

    const prompt = `Analise a imagem/documento do cronograma ou ementa acadêmica a seguir.
Extraia:
1. Data de início do período (ISO: YYYY-MM-DD, se identificável).
2. Data de fim do período (ISO: YYYY-MM-DD, se identificável).
3. Lista de nomes de matérias/disciplinas identificadas.
4. Datas de provas, trabalhos e avaliações por matéria (subject, title, date no formato YYYY-MM-DD).
5. Sugestão inicial de eventos de estudo (day, date, title, subject, type: "quiz"|"flashcards"|"leitura"|"resumo", time: "18:00").

Formato JSON estrito esperado:
{
  "periodStartDate": "YYYY-MM-DD",
  "periodEndDate": "YYYY-MM-DD",
  "subjects": ["Matéria 1", "Matéria 2"],
  "examDates": [
    { "subject": "Matéria 1", "title": "Prova P1", "date": "YYYY-MM-DD" }
  ],
  "suggestedScheduleEvents": [
    { "day": "Seg", "date": "10 Mar", "title": "Revisão P1", "subject": "Matéria 1", "type": "flashcards", "time": "18:00" }
  ]
}`;

    const parts: any[] = [];
    if (fileData.dataBase64) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType || 'image/png',
          data: fileData.dataBase64,
        },
      });
    }
    if (fileData.textContent) {
      parts.push({ text: `Texto extraído do documento: ${fileData.textContent}` });
    }
    parts.push({ text: prompt });

    const response = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Flash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textOutput);

    return {
      periodStartDate: parsed.periodStartDate,
      periodEndDate: parsed.periodEndDate,
      subjects: parsed.subjects || [],
      examDates: parsed.examDates || [],
      suggestedScheduleEvents: parsed.suggestedScheduleEvents || [],
    };
  }

  public async generateDailyBriefingStream(
    studentName: string,
    metrics: { dueFlashcardsCount: number; todayEvents: string[] },
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const prompt = `Você é um mentor universitário empático e focado na aprendizagem ativa para a estudante ${studentName}.
Elabore um briefing matinal curto (2 a 3 frases) encorajador e prático.

DADOS DA ESTUDANTE:
- Nome: ${studentName}
- Flashcards pendentes hoje: ${metrics.dueFlashcardsCount}
- Compromissos/Revisões do dia: ${metrics.todayEvents.join(', ') || 'Revisões regulares'}

Instruções:
- Comece com uma saudação calorosa.
- Destaque as revisões pendentes e oriente a priorização.
- Seja direto, motivador e focado em estudo espaçado.`;

    let fullText = '';
    if (!this.apiKey) {
      // Fallback de streaming determinístico rápido em milissegundos para dev/offline
      const fallbackText = `Oi ${studentName}, bom dia! Vi que você tem ${metrics.dueFlashcardsCount} flashcards pendentes de revisão e compromissos importantes hoje (${metrics.todayEvents.slice(0, 2).join(', ')}). Sugiro focar em 15 minutos de estudo ativo espaçado para garantir a retenção máxima!`;
      const words = fallbackText.split(' ');
      for (const word of words) {
        const chunk = word + ' ';
        fullText += chunk;
        onChunk(chunk);
        await new Promise(r => setTimeout(r, 25));
      }
      return fullText.trim();
    }

    try {
      const response = await geminiFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const data = await response.json() as any;
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      fullText = textOutput;

      const words = textOutput.split(' ');
      for (const word of words) {
        const chunk = word + ' ';
        onChunk(chunk);
        await new Promise(r => setTimeout(r, 20));
      }
      return fullText;
    } catch {
      const fallbackText = `Oi ${studentName}, bom dia! Vamos iniciar a rotina de hoje com ${metrics.dueFlashcardsCount} flashcards e foco na retenção ativa!`;
      onChunk(fallbackText);
      return fallbackText;
    }
  }
}
