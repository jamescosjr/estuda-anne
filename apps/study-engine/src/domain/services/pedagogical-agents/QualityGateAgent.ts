import { Flashcard } from '../../entities/Flashcard.js';
import { Quiz } from '../../entities/Quiz.js';
import {
  isPedagogicallyOffTopic,
  isDocumentMetaReferencing,
  isDuplicateOrHighlySimilar,
  isGroundedInCorpus,
} from '../StudyCorpusSanitizer.js';

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
    quiz: Quiz | null,
    sourceCorpus?: string
  ): QualityCheckResult {
    if (!summary || summary.trim().length === 0) {
      return { passed: false, score: 0, reason: 'Resumo ausente ou insuficiente' };
    }

    if (isDocumentMetaReferencing(summary) || isPedagogicallyOffTopic(summary)) {
      return {
        passed: false,
        score: 10,
        reason: 'Resumo contém referências a falha de leitura, arquivo corrompido ou metadados de documento',
      };
    }

    if (!keyConcepts || keyConcepts.length === 0) {
      return { passed: false, score: 30, reason: 'Nenhum conceito-chave identificado' };
    }

    if (!flashcards || flashcards.length === 0) {
      return { passed: false, score: 50, reason: 'Flashcards pedagógicos não gerados' };
    }

    const groundingCorpus = [sourceCorpus, summary].filter(Boolean).join(' ');

    // Validação de duplicidade, referências a PDF/documento, ancoragem no corpus e qualidade em Flashcards
    const flashcardFronts: string[] = [];
    for (const fc of flashcards) {
      if (
        isDocumentMetaReferencing(fc.front) ||
        isDocumentMetaReferencing(fc.back) ||
        isPedagogicallyOffTopic(fc.front) ||
        isPedagogicallyOffTopic(fc.back)
      ) {
        return {
          passed: false,
          score: 60,
          reason: `Flashcard contém referências a formato de documento ou PDF: "${fc.front.slice(0, 45)}"`,
        };
      }

      if (
        groundingCorpus.trim().length >= 30 &&
        !isGroundedInCorpus(`${fc.front} ${fc.back}`, groundingCorpus, keyConcepts)
      ) {
        return {
          passed: false,
          score: 58,
          reason: `Flashcard sem ancoragem lexical no material enviado pelo usuário: "${fc.front.slice(0, 45)}"`,
        };
      }

      if (fc.front.trim().length < 12 || fc.back.trim().length < 15) {
        return {
          passed: false,
          score: 55,
          reason: 'Flashcard com pergunta ou resposta rasa/incompleta',
        };
      }

      if (isDuplicateOrHighlySimilar(fc.front, flashcardFronts, 0.60)) {
        return {
          passed: false,
          score: 60,
          reason: `Flashcards duplicados ou repetidos detectados no lote: "${fc.front.slice(0, 45)}"`,
        };
      }
      flashcardFronts.push(fc.front.trim());
    }

    // Validação de duplicidade, ancoragem e qualidade no Quiz
    if (quiz && quiz.questions.length > 0) {
      const questionPrompts: string[] = [];
      for (const q of quiz.questions) {
        if (isPedagogicallyOffTopic(q.prompt) || isDocumentMetaReferencing(q.prompt)) {
          return {
            passed: false,
            score: 65,
            reason: 'Pergunta fora do conteúdo da matéria (metadados, data de arquivo, PDF ou aluna Anne)',
          };
        }

        if (
          groundingCorpus.trim().length >= 30 &&
          !isGroundedInCorpus(`${q.prompt} ${q.options.join(' ')}`, groundingCorpus, keyConcepts)
        ) {
          return {
            passed: false,
            score: 62,
            reason: `Questão de quiz sem ancoragem no material enviado pelo usuário: "${q.prompt.slice(0, 45)}"`,
          };
        }

        if (isDuplicateOrHighlySimilar(q.prompt, questionPrompts, 0.60)) {
          return { passed: false, score: 70, reason: 'Perguntas duplicadas ou muito semelhantes no quiz' };
        }
        questionPrompts.push(q.prompt.trim());

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
