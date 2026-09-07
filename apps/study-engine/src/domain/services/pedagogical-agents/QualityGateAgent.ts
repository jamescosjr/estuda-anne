import { Flashcard } from '../../entities/Flashcard.js';
import { Quiz } from '../../entities/Quiz.js';
import { isPedagogicallyOffTopic } from '../StudyCorpusSanitizer.js';

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  reason?: string;
}

export class QualityGateAgent {
  public evaluateQuality(
    summary: string,
    keyConcepts: readonly string[],
    flashcards: Flashcard[],
    quiz: Quiz | null
  ): QualityCheckResult {
    if (!summary || summary.trim().length === 0) {
      return { passed: false, score: 0, reason: 'Resumo ausente ou insuficiente' };
    }

    if (!keyConcepts || keyConcepts.length === 0) {
      return { passed: false, score: 30, reason: 'Nenhum conceito-chave identificado' };
    }

    if (!flashcards || flashcards.length === 0) {
      return { passed: false, score: 50, reason: 'Flashcards pedagógicos não gerados' };
    }

    // Validação de duplicidade e qualidade em Flashcards
    const flashcardFronts = new Set<string>();
    for (const fc of flashcards) {
      const normalizedFront = fc.front.trim().toLowerCase();
      if (flashcardFronts.has(normalizedFront)) {
        return { passed: false, score: 60, reason: 'Flashcards duplicados detectados no lote' };
      }
      flashcardFronts.add(normalizedFront);
    }

    // Validação de duplicidade e qualidade no Quiz
    if (quiz && quiz.questions.length > 0) {
      const questionPrompts = new Set<string>();
      for (const q of quiz.questions) {
        const normalizedPrompt = q.prompt.trim().toLowerCase();
        if (questionPrompts.has(normalizedPrompt)) {
          return { passed: false, score: 70, reason: 'Perguntas duplicadas detectadas no quiz' };
        }
        if (isPedagogicallyOffTopic(q.prompt)) {
          return {
            passed: false,
            score: 65,
            reason: 'Pergunta fora do conteúdo da matéria (metadados, data de arquivo ou personagem Anne)',
          };
        }
        questionPrompts.add(normalizedPrompt);

        // Verifica duplicidade nas opções da mesma questão
        const normalizedOptions = new Set(q.options.map(o => o.trim().toLowerCase()));
        if (normalizedOptions.size < q.options.length) {
          return { passed: false, score: 75, reason: 'Opções duplicadas encontradas em uma questão do quiz' };
        }
      }
    }

    return {
      passed: true,
      score: 100,
      reason: 'Material aprovado no controle de qualidade pedagógico!',
    };
  }
}
