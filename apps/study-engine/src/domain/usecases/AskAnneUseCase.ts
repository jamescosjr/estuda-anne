import { ILanguageModelService } from '../ports/ILanguageModelService.js';
import { IMaterialRepository } from '../ports/IMaterialRepository.js';

export interface AskAnneInput {
  studentId: string;
  question: string;
  subject?: string;
  studentName?: string;
}

export interface AskAnneOutput {
  answer: string;
  suggestedNextQuestions: string[];
  subject: string;
  createdAt: Date;
}

export class AskAnneUseCase {
  constructor(
    private readonly llmService: ILanguageModelService,
    private readonly materialRepository?: IMaterialRepository
  ) {}

  public async execute(input: AskAnneInput): Promise<AskAnneOutput> {
    if (!input.question || input.question.trim() === '') {
      throw new Error('A pergunta não pode estar em branco.');
    }

    const studentName = input.studentName || 'Estudante';
    const targetSubject = input.subject || 'Geral';

    let materialContext = '';
    if (this.materialRepository && input.studentId) {
      try {
        const materials = await this.materialRepository.findByStudentId(input.studentId);
        const filtered = input.subject
          ? materials.filter((m) => m.subject?.toLowerCase() === input.subject!.toLowerCase())
          : materials;
        if (filtered.length > 0) {
          materialContext = filtered.slice(0, 3).map((m) => `- ${m.title} (${m.subject || 'Geral'})`).join('\n');
        }
      } catch {
        // Fallback silencioso
      }
    }

    const systemPrompt = `Você é a Anne, uma tutora e mentora acadêmica universitária altamente capacitada, empática e didática.
Sua missão é responder à dúvida enviada pela estudante ${studentName} de forma direta, clara, acolhedora e biologicamente/pedagogicamente eficiente.

CONTEXTO DE ESTUDO DA ESTUDANTE:
- Nome: ${studentName}
- Disciplina em foco: ${targetSubject}
${materialContext ? `- Materiais cadastrados:\n${materialContext}` : ''}

REGRAS DE RESPOSTA:
1. Responda com clareza conceitual, dividindo em tópicos se necessário.
2. Forneça exemplos práticos e analógicos sempre que útil.
3. Termine com uma pergunta provocativa de estudo ativo para testar a retenção.
4. Mantenha tom encorajador, sem enrolação.`;

    const fullPrompt = `${systemPrompt}\n\nPERGUNTA DA ESTUDANTE:\n"${input.question}"`;

    let answer = '';
    if (this.llmService.generateContent) {
      answer = await this.llmService.generateContent({
        prompt: fullPrompt,
        temperature: 0.6,
      });
    }

    const suggestedNextQuestions = [
      `Como posso aplicar o conceito de ${targetSubject} em um exercício prático?`,
      `Qual a diferença entre os tópicos principais de ${targetSubject}?`,
      `Pode me dar 2 flashcards rápidos sobre esse assunto?`,
    ];

    return {
      answer: answer || 'Desculpe, não consegui processar a resposta no momento. Tente novamente em instantes!',
      suggestedNextQuestions,
      subject: targetSubject,
      createdAt: new Date(),
    };
  }
}
