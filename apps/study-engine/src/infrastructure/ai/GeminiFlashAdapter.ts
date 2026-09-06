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
          front: `[Card ${i + 1}] Qual o significado e aplicação do tópico: "${topic.slice(0, 60)}..."?`,
          back: `Representa o conceito-chave: ${topic}. Essencial para fixação e retenção no exame.`,
        });
      }

      return cards.length > 0 ? cards : [
        {
          front: 'Qual o conceito central abordado neste material de estudo?',
          back: content.slice(0, 120).trim() + '...',
        },
        {
          front: 'Como aplicar os fundamentos teóricos em exercícios práticos?',
          back: 'Relacionando os axiomas principais com resolução ativa de problemas e estudo espaçado.',
        },
        {
          front: 'Qual a principal diferença entre os modelos apresentados no texto?',
          back: 'A abrangência analítica e a eficiência na interpretação dos resultados em exames.',
        },
      ];
    }

    const prompt = `Você é um Engenheiro Pedagógico especialista em elaboração de exames universitários.
Gere exatamente ${count} flashcards de alta qualidade pedagógica a partir do texto a seguir.

REGRAS RÍGIDAS DE QUALIDADE:
1. Cada flashcard deve abordar um tópico/aspecto TOTALMENTE DIFERENTE do texto (conceito, aplicação, definição, análise crítica).
2. NUNCA repita enunciados, perguntas ou respostas.
3. As perguntas (front) devem ser claras, profundas e objetivas. As respostas (back) devem ser completas e explicativas.

Formato JSON estrito esperado:
[{"front": "...", "back": "..."}]

Texto:
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
    return JSON.parse(textOutput);
  }

  public async generateQuizQuestions(content: string, questionsCount = 4): Promise<GeneratedQuizQuestionDTO[]> {
    if (!this.apiKey) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
      const questions: GeneratedQuizQuestionDTO[] = [];

      for (let i = 0; i < questionsCount; i++) {
        const sentence = sentences[i % sentences.length] || `tópico central de estudo número ${i + 1}`;
        questions.push({
          prompt: `Em relação ao trecho "${sentence.slice(0, 70)}...", assinale a alternativa correta:`,
          options: [
            `Trata-se do conceito principal referente a ${sentence.slice(0, 40)}.`,
            `É uma exceção aplicável apenas em condições laboratoriais específicas.`,
            `Representa um erro comum de interpretação que deve ser evitado.`,
            `Nenhuma das alternativas anteriores está de acordo com a teoria.`,
          ],
          correctAnswerIndex: 0,
          explanation: `A afirmação reflete o ponto correto: ${sentence}.`,
        });
      }

      return questions;
    }

    const prompt = `Você é um Professor Universitário responsável por criar quizzes de avaliação para a aluna Anne.
Gere exatamente ${questionsCount} questões de múltipla escolha inéditas a partir do conteúdo fornecido.

REGRAS OBRIGATÓRIAS DE EXCELÊNCIA PEDAGÓGICA:
1. Cada questão deve testar um conceito/tópico TOTALMENTE DIFERENTE.
2. NUNCA gere perguntas repetidas ou com enunciados parecidos.
3. Todas as 4 opções (0 a 3) em CADA questão devem ser ÚNICAS, plausíveis e bem formuladas. Sem opções óbvias ou idênticas.
4. Indique o índice exato da resposta correta (correctAnswerIndex de 0 a 3) e uma explicação didática e encorajadora no campo "explanation".

Formato JSON estrito esperado:
[
  {
    "prompt": "...",
    "options": ["opcao 0", "opcao 1", "opcao 2", "opcao 3"],
    "correctAnswerIndex": 0,
    "explanation": "..."
  }
]

Conteúdo:
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
    return JSON.parse(textOutput);
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
}
