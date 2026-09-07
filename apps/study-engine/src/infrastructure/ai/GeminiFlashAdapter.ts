import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, GoogleAICacheManager } from '@google/generative-ai/server';
import {
  ILanguageModelService,
  MaterialAnalysisResult,
  GeneratedFlashcardDTO,
  GeneratedQuizQuestionDTO,
  ParsedScheduleAnalysisResult,
  ContextCacheHandle,
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
  const timeoutMs = 120000;
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

  public async createContextCache(fileData: {
    mimeType?: string;
    dataBase64?: string;
    textContent?: string;
    fileName?: string;
  }): Promise<ContextCacheHandle | null> {
    if (!this.apiKey) {
      return null;
    }

    const mimeType = fileData.mimeType || (fileData.dataBase64 ? 'application/pdf' : 'text/plain');
    const extension = mimeType.includes('pdf')
      ? '.pdf'
      : mimeType.includes('png')
      ? '.png'
      : mimeType.includes('jpg') || mimeType.includes('jpeg')
      ? '.jpg'
      : '.txt';

    const tempFilePath = join(
      tmpdir(),
      `cache_upload_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
    );

    let uploadedFile: { name: string; uri: string; mimeType: string } | null = null;
    const fileManager = new GoogleAIFileManager(this.apiKey);
    const cacheManager = new GoogleAICacheManager(this.apiKey);

    try {
      if (fileData.dataBase64) {
        const buffer = Buffer.from(fileData.dataBase64, 'base64');
        writeFileSync(tempFilePath, buffer);
      } else if (fileData.textContent) {
        writeFileSync(tempFilePath, fileData.textContent, 'utf-8');
      } else {
        return null;
      }

      // 1. Upload do arquivo via GoogleAIFileManager
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType,
        displayName: fileData.fileName || 'Estuda Anne Material',
      });
      uploadedFile = uploadResult.file;

      // 2. Criação do Cache via GoogleAICacheManager (10 min TTL)
      const cache = await cacheManager.create({
        model: 'models/gemini-1.5-flash-001',
        contents: [
          {
            role: 'user',
            parts: [{ fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri } }],
          },
        ],
        ttlSeconds: 600,
      });

      return {
        cache,
        file: uploadedFile,
      };
    } catch (error) {
      logStructured({
        service: 'study-engine',
        event: 'gemini_cache_create_error',
        error: error instanceof Error ? error.message : String(error),
      });

      if (uploadedFile?.name) {
        try {
          await fileManager.deleteFile(uploadedFile.name);
        } catch {}
      }
      return null;
    } finally {
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch {}
      }
    }
  }

  public async deleteContextCache(handle: ContextCacheHandle | null): Promise<void> {
    if (!handle || !this.apiKey) return;
    const cacheManager = new GoogleAICacheManager(this.apiKey);
    const fileManager = new GoogleAIFileManager(this.apiKey);

    if (handle.cache?.name) {
      try {
        await cacheManager.delete(handle.cache.name);
      } catch (error) {
        logStructured({
          service: 'study-engine',
          event: 'gemini_cache_delete_error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (handle.file?.name) {
      try {
        await fileManager.deleteFile(handle.file.name);
      } catch (error) {
        logStructured({
          service: 'study-engine',
          event: 'gemini_file_delete_error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  public async extractConceptsAndSummary(
    content: string,
    options?: { cacheHandle?: ContextCacheHandle | null }
  ): Promise<MaterialAnalysisResult> {
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

    if (options?.cacheHandle?.cache) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModelFromCachedContent(options.cacheHandle.cache as any, {
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `Você é um coordenador pedagógico especialista em microlearning.
Analise o material de estudo enviado no contexto em cache.
Ignore metadados de arquivo (autor, CreationDate, datas ISO/Node, nome do PDF).

REGRAS DE QUALIDADE:
- Resumo estruturado e conciso dos CONCEITOS da matéria (não da aluna).
- Até 5 conceitos-chave essenciais, priorizando os que mais caem em prova.
- Evite jargões desnecessários.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.

Formato esperado:
{"summary": "...", "keyConcepts": ["..."]}`;

      const result = await model.generateContent(prompt);
      const textOutput = result.response.text();
      const parsed = JSON.parse(textOutput);

      return {
        summary: parsed.summary,
        keyConcepts: parsed.keyConcepts ?? [],
      };
    }

    // Chamada HTTP otimizada para o Gemini Flash via API REST (fallback sem cache)
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
    focusTopics?: Array<{ topic: string; priorityWeight: number }>,
    options?: { cacheHandle?: ContextCacheHandle | null; keyConcepts?: readonly string[] }
  ): Promise<GeneratedFlashcardDTO[]> {
    if (!this.apiKey) {
      const concepts = options?.keyConcepts || [];
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
      const cards: GeneratedFlashcardDTO[] = [];
      const distinctTopics = Array.from(new Set(concepts.length > 0 ? concepts : sentences));
      const existingSet = new Set((existingPrompts || []).map(p => p.trim().toLowerCase()));

      const triggers = [
        (topic: string) => `[Definição] Qual a caracterização atômica de: ${topic.slice(0, 45)}?`,
        (topic: string) => `[Mecanismo] Como opera o processo de: ${topic.slice(0, 45)}?`,
        (topic: string) => `[Aplicação] De que maneira o fundamento de ${topic.slice(0, 35)} se aplica na prática?`,
        (topic: string) => `[Causa & Efeito] Qual o impacto direto de ${topic.slice(0, 35)} no resultado do sistema?`,
        (topic: string) => `[Limitação] Qual a condição limite ou ponto crítico em relação a ${topic.slice(0, 35)}?`,
      ];

      for (let i = 0; i < Math.min(count, Math.max(3, distinctTopics.length)); i++) {
        const topic = distinctTopics[i] || `Conceito fundamental ${i + 1}`;
        const triggerFn = triggers[i % triggers.length];
        const front = triggerFn(topic);
        if (existingSet.has(front.toLowerCase())) continue;

        cards.push({
          front,
          back: `Explicação do conceito chave de ${topic.slice(0, 40)}. Assegura retenção e compreensão atômica sem ambiguidades.`,
        });
      }

      return cards.length > 0 ? cards : [
        {
          front: '[Definição] Qual a definição atômica do conceito principal da matéria?',
          back: content.slice(0, 100).trim() + '.',
        },
        {
          front: '[Mecanismo] Como aplicar este fundamento na prática acadêmica?',
          back: 'Relacionando os axiomas teóricos com resolução ativa de problemas.',
        },
        {
          front: '[Diferenciação] Qual o ponto crítico de diferenciação entre os modelos?',
          back: 'A abrangência analítica e a eficiência no diagnóstico de resultados.',
        },
      ];
    }

    const conceptsBlock = options?.keyConcepts && options.keyConcepts.length > 0
      ? `\nCONCEITOS-CHAVE OBRIGATÓRIOS DO MATERIAL:\nExplore obrigatoriamente e com profundidade os seguintes conceitos específicos deste material:\n${options.keyConcepts.map(c => `- ${c}`).join('\n')}\n`
      : '';

    const prohibitionBlock = existingPrompts && existingPrompts.length > 0
      ? `\nPROIBIÇÃO DE REPETIÇÃO (REGRA ABSOLUTA):\nNUNCA crie flashcards com enunciados ou conceitos iguais/semelhantes aos seguintes cards já respondidos pela aluna:\n${existingPrompts.slice(0, 25).map(p => `- "${p}"`).join('\n')}\n`
      : '';

    const focusBlock = focusTopics && focusTopics.length > 0
      ? `\nDIRECIONAMENTO DE PESOS POR TÓPICO:\nPriorize (60% de foco) os tópicos com maior taxa de erro recente:\n${focusTopics.map(t => `- Tópico: ${t.topic} (Peso de prioridade: ${t.priorityWeight})`).join('\n')}\nMantenha 40% de cobertura proporcional do restante do material.\n`
      : '';

    if (options?.cacheHandle?.cache) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModelFromCachedContent(options.cacheHandle.cache as any, {
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const prompt = `Você é um coordenador pedagógico especialista em microlearning acadêmico profissional.
Gere flashcards atômicos, profundos e totalmente inéditos sobre o CONTEÚDO do material em cache, nunca sobre o documento.

MATRIZ DE DIVERSIDADE PEDAGÓGICA (Obrigatório distribuir os ${count} flashcards entre estes ângulos cognitivos):
- CARD 1 (Definição & Conceito Fundamental): Foque na essência teórica e significado atômico do principal conceito.
- CARD 2 (Mecanismo & Funcionamento Interno): Explique o 'como funciona' ou o processo interno por trás do conceito.
- CARD 3 (Causa & Efeito / Relação): Aborde o impacto, consequência ou relação direta entre elementos da disciplina.
- CARD 4 (Aplicação Prática / Resolução de Problema): Como o fundamento é aplicado em um cenário ou problema real da matéria.
- CARD 5 (Diferenciação / Limitação / Ponto Crítico): Destaque a diferença entre conceitos parecidos, exceção ou condição limite.

REGRAS RÍGIDAS DE QUALIDADE (OBRIGATÓRIAS):
1. DIVERSIDADE ABSOLUTA E ANTI-REPETIÇÃO: Cada um dos ${count} flashcards DEVE focar em um ângulo DIFERENTE e ÚNICO do conteúdo. NUNCA gere flashcards parecidos ou repetitivos. Varia obrigatoriamente os gatilhos dos enunciados (ex: "Qual o mecanismo...", "Como o princípio X afeta Y...", "Qual a diferença crítica entre...", "Em que condição ocorre..."). PROIBIDO usar "O que é X?" em todos os cartões.
2. CONTEÚDO 100% AUTO-CONTIDO: Tanto a pergunta (frente) quanto a resposta (verso) devem ser totalmente auto-explicativas. A pergunta contextualiza o tema sem depender de texto externo. O verso deve ser direto e pedagogicamente rico (2 a 3 frases explicativas).
3. ZERO REFERÊNCIAS A ARQUIVO/PDF/ESTRUTURA: É ESTRITAMENTE PROIBIDO usar palavras como "PDF", "documento", "arquivo", "página", "item", "seção", "anexo", "texto enviado" ou "autor".
4. ZERO PERSONAGENS OU METADADOS: NUNCA mencione a estudante Anne. NUNCA pergunte sobre datas, autores, metadados ou formatações.
5. PROGRESSÃO GRADATIVA E ENCADECAMENTO DE PRÉ-REQUISITOS: Os ${count} flashcards DEVEM respeitar o encadeamento lógico do aprendizado (do conceito mais fundamental/pré-requisito que sustenta o assunto até as suas aplicações/derivações mais avançadas). Nunca cobre um conceito avançado sem antes consolidar o pré-requisito base.
${conceptsBlock}${prohibitionBlock}${focusBlock}
TAREFA:
Gere ${count} flashcards profissionais, distintos, variados e auto-contidos sobre a disciplina.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.
[
  {
    "front": "...",
    "back": "..."
  }
]`;

      const result = await model.generateContent(prompt);
      const textOutput = result.response.text();
      return JSON.parse(textOutput);
    }

    const prompt = `Você é um coordenador pedagógico especialista em microlearning acadêmico profissional.
Gere flashcards atômicos, profundos e totalmente inéditos sobre o CONTEÚDO da matéria, nunca sobre o documento.

MATRIZ DE DIVERSIDADE PEDAGÓGICA (Obrigatório distribuir os ${count} flashcards entre estes ângulos cognitivos):
- CARD 1 (Definição & Conceito Fundamental): Foque na essência teórica e significado atômico do principal conceito.
- CARD 2 (Mecanismo & Funcionamento Interno): Explique o 'como funciona' ou o processo interno por trás do conceito.
- CARD 3 (Causa & Efeito / Relação): Aborde o impacto, consequência ou relação direta entre elementos da disciplina.
- CARD 4 (Aplicação Prática / Resolução de Problema): Como o fundamento é aplicado em um cenário ou problema real da matéria.
- CARD 5 (Diferenciação / Limitação / Ponto Crítico): Destaque a diferença entre conceitos parecidos, exceção ou condição limite.

REGRAS RÍGIDAS DE QUALIDADE (OBRIGATÓRIAS):
1. DIVERSIDADE ABSOLUTA E ANTI-REPETIÇÃO: Cada um dos ${count} flashcards DEVE focar em um ângulo DIFERENTE e ÚNICO do conteúdo. NUNCA gere flashcards parecidos ou repetitivos. Varia obrigatoriamente os gatilhos dos enunciados (ex: "Qual o mecanismo...", "Como o princípio X afeta Y...", "Qual a diferença crítica entre...", "Em que condição ocorre..."). PROIBIDO usar "O que é X?" em todos os cartões.
2. CONTEÚDO 100% AUTO-CONTIDO: Tanto a pergunta (frente) quanto a resposta (verso) devem ser totalmente auto-explicativas. A pergunta deve contextualizar o conceito sem depender de texto externo. O verso deve ser completo, claro e pedagogicamente rico (2 a 3 frases explicativas ou tópicos diretos).
3. ZERO REFERÊNCIAS A ARQUIVO/PDF/ESTRUTURA: É ESTRITAMENTE PROIBIDO usar palavras como "PDF", "documento", "arquivo", "página", "item", "seção", "anexo", "texto enviado", "conforme o texto", "de acordo com o texto" ou "autor". O flashcard deve tratar puramente da ciência/conceito da matéria.
4. ZERO PERSONAGENS OU METADADOS: NUNCA mencione a estudante Anne. NUNCA pergunte sobre datas, autores, metadados ou formatações.
5. PROGRESSÃO GRADATIVA E ENCADECAMENTO DE PRÉ-REQUISITOS: Os ${count} flashcards DEVEM respeitar o encadeamento lógico do aprendizado (do conceito mais fundamental/pré-requisito que sustenta o assunto até as suas aplicações/derivações mais avançadas). Nunca cobre um conceito avançado sem antes consolidar o pré-requisito base.

MATERIAL BASE:
${content.slice(0, 10000)}
${conceptsBlock}${prohibitionBlock}${focusBlock}
TAREFA:
Gere ${count} flashcards profissionais, distintos, variados e auto-contidos sobre a disciplina.

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
            temperature: 0.7,
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
    focusTopics?: Array<{ topic: string; priorityWeight: number }>,
    options?: { cacheHandle?: ContextCacheHandle | null }
  ): Promise<GeneratedQuizQuestionDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const questions: GeneratedQuizQuestionDTO[] = [];

      for (let i = 0; i < questionsCount; i++) {
        const sentence = sentences[i % sentences.length] || `tópico de aplicação acadêmica ${i + 1}`;
        const targetIndex = i % 4;
        const correctText = `A afirmação descreve um fundamento do conteúdo: ${sentence.slice(0, 40)}.`;
        const distractors = [
          `Ignorar o contexto inicial e utilizar uma aproximação empírica genérica.`,
          `Confundir a hipótese de partida com o resultado de amostragem secundário.`,
          `Desconsiderar as restrições operacionais e atuar apenas no escopo teórico.`,
        ];

        const optionsArr = [...distractors];
        optionsArr.splice(targetIndex, 0, correctText);

        questions.push({
          prompt: `Segundo o material, o que é correto sobre: "${sentence.slice(0, 80)}"?`,
          options: optionsArr,
          correctAnswerIndex: targetIndex,
          explanation: `A alternativa correta (${String.fromCharCode(65 + targetIndex)}) aplica diretamente os princípios de ${sentence.slice(0, 30)}. As demais opções são distratoras teóricas incorretas.`,
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

    if (options?.cacheHandle?.cache) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModelFromCachedContent(options.cacheHandle.cache as any, {
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const prompt = `Você é um coordenador pedagógico especialista em microlearning acadêmico. Gere questões de prova sobre o CONTEÚDO do material em cache.

REGRAS DE QUALIDADE:
1. As perguntas devem ser curtas e instigantes.
2. Evite jargões desnecessários.
3. Alternativas incorretas devem ser confusões reais da disciplina.
4. VARIABILIDADE DA RESPOSTA CORRETA (MUITO IMPORTANTE): Distribua a alternativa correta de forma variada e equilibrada entre as posições 0, 1, 2 e 3 (Opções A, B, C e D). NUNCA coloque a resposta certa sempre na opção 0 / Opção A.
5. Inclua "explicacao" dizendo por que a correta está certa e por que a distratora mais plausível erra.
6. PROGRESSÃO GRADATIVA E ENCADECAMENTO DE PRÉ-REQUISITOS: Apresente as questões na ordem lógica de dependência (começando pelas questões dos conceitos fundamentais e pré-requisitos de base, avançando progressivamente para aplicação e síntese).
${prohibitionBlock}${focusBlock}
TAREFA:
Gere ${questionsCount} questões de múltipla escolha inéditas cobrindo o material.

DISTRIBUIÇÃO:
- ~50% recordação/compreensão dos conceitos-chave.
- ~30% aplicação.
- ~20% análise.

PROIBIDO:
- Mencionar "Anne", a aluna, ou transformar a estudante em personagem.
- Perguntar sobre autor, data, CreationDate, ISO/Node date, metadados ou estrutura técnica de contêiner de arquivo.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.
[
  {
    "prompt": "...",
    "options": ["opcao A", "opcao B", "opcao C", "opcao D"],
    "correctAnswerIndex": 2,
    "explicacao": "..."
  }
]`;

      const result = await model.generateContent(prompt);
      const textOutput = result.response.text();
      const parsed = JSON.parse(textOutput);

      return parsed.map((item: any) => {
        const question = {
          prompt: item.prompt,
          options: item.options || [],
          correctAnswerIndex: typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0,
          explanation: item.explanation ?? item.explicacao ?? '',
        };

        const opts = question.options;
        if (opts.length <= 1) return question;

        const correctText = opts[question.correctAnswerIndex] ?? opts[0];
        const shuffledOptions = [...opts];

        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }

        const newCorrectIndex = shuffledOptions.indexOf(correctText);

        return {
          ...question,
          options: shuffledOptions,
          correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
        };
      });
    }

    const prompt = `Você é um coordenador pedagógico especialista em microlearning acadêmico. Gere questões de prova sobre o CONTEÚDO da matéria. A audiência é uma estudante, mas ela NÃO é o tema das perguntas.

REGRAS DE QUALIDADE:
1. As perguntas devem ser curtas e instigantes.
2. Evite jargões desnecessários.
3. Alternativas incorretas devem ser confusões reais da disciplina.
4. VARIABILIDADE DA RESPOSTA CORRETA (MUITO IMPORTANTE): Distribua a alternativa correta de forma variada e equilibrada entre as posições 0, 1, 2 e 3 (Opções A, B, C e D). NUNCA coloque a resposta certa sempre na opção 0 / Opção A.
5. Inclua "explicacao" dizendo por que a correta está certa e por que a distratora mais plausível erra.
6. PROGRESSÃO GRADATIVA E ENCADECAMENTO DE PRÉ-REQUISITOS: Apresente as questões na ordem lógica de dependência (começando pelas questões dos conceitos fundamentais e pré-requisitos de base, avançando progressivamente para aplicação e síntese).

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
- Perguntar sobre autor, data, CreationDate, ISO/Node date, metadados ou estrutura técnica de contêiner de arquivo (PDF, páginas, itens, "objeto 14", "stream de dados").
- Se o material tratar de computação forense ou assinaturas de arquivo, formule a pergunta de forma 100% TEÓRICA e CONCEITUAL sobre a disciplina (ex: "Qual o propósito da assinatura binária FF D8 FF E0 no cabeçalho de um arquivo de imagem?"), NUNCA citando "objeto X" ou "no arquivo enviado".
- Interpretação de uma linha isolada de cabeçalho/rodapé de arquivo.

ESTRUTURA E FORMATO DE SAÍDA:
Você deve retornar ESTRITAMENTE um JSON válido. Não use formatação markdown como \`\`\`json. Apenas o JSON puro.
[
  {
    "prompt": "...",
    "options": ["opcao A", "opcao B", "opcao C", "opcao D"],
    "correctAnswerIndex": 2,
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

    return parsed.map((item: any) => {
      const question = {
        prompt: item.prompt,
        options: item.options || [],
        correctAnswerIndex: typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0,
        explanation: item.explanation ?? item.explicacao ?? '',
      };

      // Aplica embaralhamento aleatório das opções para garantir distribuição equilibrada das respostas A, B, C, D
      const options = question.options;
      if (options.length <= 1) return question;

      const correctText = options[question.correctAnswerIndex] ?? options[0];
      const shuffledOptions = [...options];

      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }

      const newCorrectIndex = shuffledOptions.indexOf(correctText);

      return {
        ...question,
        options: shuffledOptions,
        correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      };
    });
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

  public async extractTextFromMultimodalDocument(fileData: {
    mimeType?: string;
    dataBase64?: string;
  }): Promise<string> {
    if (!this.apiKey || !fileData.dataBase64) {
      return 'Conteúdo acadêmico extraído do documento via visão multimodal para geração de resumos e flashcards de estudo.';
    }

    const mimeType = fileData.mimeType || 'application/pdf';
    const extension = mimeType.includes('pdf')
      ? '.pdf'
      : mimeType.includes('png')
      ? '.png'
      : mimeType.includes('jpg') || mimeType.includes('jpeg')
      ? '.jpg'
      : '.bin';

    const tempFilePath = join(
      tmpdir(),
      `upload_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
    );

    let uploadedFile: { name: string; uri: string; mimeType: string } | null = null;
    const fileManager = new GoogleAIFileManager(this.apiKey);

    try {
      // 1. Salva o arquivo temporário localmente
      const buffer = Buffer.from(fileData.dataBase64, 'base64');
      writeFileSync(tempFilePath, buffer);

      // 2. Upload usando GoogleAIFileManager (File API)
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType,
        displayName: 'Estuda Anne Multimodal Document',
      });
      uploadedFile = uploadResult.file;

      // 3. Inicializa SDK oficial GoogleGenerativeAI com gemini-3.6-flash
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

      const prompt = `Você é um coordenador pedagógico especialista em microlearning.
Extraia e transcreva todo o texto e conteúdo acadêmico relevante presente neste documento/imagem/PDF.
Retorne APENAS o texto extraído do material na íntegra, sem formatação markdown extra nem saudações.`;

      // 4. Configura timeout de 120.000 ms (120 segundos)
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 120000);

      try {
        const result = await model.generateContent(
          [
            {
              fileData: {
                mimeType: uploadedFile.mimeType,
                fileUri: uploadedFile.uri,
              },
            },
            { text: prompt },
          ],
          { requestOptions: { timeout: 120000, signal: controller.signal } } as any
        );

        const responseText = result.response.text();
        return responseText ? responseText.trim() : '';
      } finally {
        clearTimeout(timeoutTimer);
      }
    } finally {
      // 5. Limpeza do arquivo temporário no disco local
      if (existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch {
          // Ignora erros ao apagar arquivo temporário local
        }
      }

      // 6. Limpeza do arquivo na File API do Google (evita acúmulo de armazenamento)
      if (uploadedFile?.name) {
        try {
          await fileManager.deleteFile(uploadedFile.name);
        } catch {
          // Ignora erros ao apagar arquivo remoto da File API
        }
      }
    }
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
