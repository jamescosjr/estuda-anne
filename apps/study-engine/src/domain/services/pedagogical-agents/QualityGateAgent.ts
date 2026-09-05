import { Flashcard } from '../../entities/Flashcard.js';
import { Quiz } from '../../entities/Quiz.js';

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

    return {
      passed: true,
      score: 100,
      reason: 'Material aprovado no controle de qualidade pedagógico!',
    };
  }
}
