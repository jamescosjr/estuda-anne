import {
  ILanguageModelService,
  MaterialAnalysisResult,
  GeneratedFlashcardDTO,
  GeneratedQuizQuestionDTO,
  ParsedScheduleAnalysisResult,
} from '../../domain/ports/ILanguageModelService.js';
import { env } from '../config/env.js';

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
    const prompt = `Analise o seguinte material de estudo e forneça:
1. Um resumo estruturado e conciso para a estudante Anne.
2. Até 5 conceitos-chave essenciais.
Formato JSON esperado:
{"summary": "...", "keyConcepts": ["..."]}

Material:
${content.slice(0, 10000)}`;

    const response = await fetch(
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

  public async generateFlashcards(content: string, count = 5): Promise<GeneratedFlashcardDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
      const cards: GeneratedFlashcardDTO[] = [];
      const distinctTopics = Array.from(new Set(sentences));

      for (let i = 0; i < Math.min(count, Math.max(3, distinctTopics.length)); i++) {
        const topic = distinctTopics[i] || `Conceito fundamental ${i + 1}`;
        cards.push({
          front: `[Gatilho] O que caracteriza: ${topic.slice(0, 45)}?`,
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

    const prompt = `Você é um tutor universitário de excelência, especialista em aprendizagem ativa. Seu objetivo é ajudar uma estudante universitária chamada Anne a dominar os conceitos do material fornecido.

MATERIAL BASE:
${content.slice(0, 10000)}

TAREFA:
Gere ${count} flashcards com base estritamente no material acima.

REGRAS PARA FLASHCARDS:
1. Seja atômico: cada flashcard deve focar em apenas UM conceito chave.
2. Formato frente/verso: A frente deve ser um gatilho de memória (pergunta rápida ou termo). O verso deve ter no máximo 2 frases curtas.

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido seguindo a estrutura esperada pela nossa aplicação, sem formatação markdown em volta:
[
  {
    "front": "...",
    "back": "..."
  }
]`;

    const response = await fetch(
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

  public async generateQuizQuestions(content: string, questionsCount = 4): Promise<GeneratedQuizQuestionDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const questions: GeneratedQuizQuestionDTO[] = [];

      for (let i = 0; i < questionsCount; i++) {
        const sentence = sentences[i % sentences.length] || `tópico de aplicação acadêmica ${i + 1}`;
        questions.push({
          prompt: `[Estudo de Caso] Suponha que Anne precisa analisar o seguinte cenário prático relacionado a "${sentence.slice(0, 50)}...": qual a melhor decisão técnica e por quê?`,
          options: [
            `Aplicar o modelo direto, fundamentado em ${sentence.slice(0, 30)}.`,
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

    const prompt = `Você é um tutor universitário de excelência, especialista em aprendizagem ativa. Seu objetivo é ajudar uma estudante universitária chamada Anne a dominar os conceitos do material fornecido.

MATERIAL BASE:
${content.slice(0, 10000)}

TAREFA:
Gere ${questionsCount} quizzes com base estritamente no material acima.

REGRAS PARA QUIZZES (Múltipla Escolha):
1. Crie cenários práticos ou estudos de caso sempre que possível, forçando o pensamento crítico (nível de "Aplicação" e "Análise" da Taxonomia de Bloom).
2. As alternativas incorretas devem ser âncoras plausíveis, representando conceitos parecidos ou confusões comuns. Não crie alternativas obviamente falsas.
3. Inclua uma propriedade "explicacao" no JSON detalhando exatamente por que a alternativa correta é a certa e por que a mais plausível entre as erradas está incorreta.

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido seguindo a estrutura esperada pela nossa aplicação, sem formatação markdown em volta:
[
  {
    "prompt": "...",
    "options": ["opcao 0", "opcao 1", "opcao 2", "opcao 3"],
    "correctAnswerIndex": 0,
    "explicacao": "..."
  }
]`;

    const response = await fetch(
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

    const response = await fetch(
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
      const response = await fetch(
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
