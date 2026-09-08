import { describe, it, expect } from 'vitest';
import { Quiz } from '../../src/domain/entities/Quiz.js';
import {
  composeQuizSession,
  flattenQuizzes,
  rankBankByWeakness,
} from '../../src/domain/services/QuizStudySession.js';

function makeQuiz(id: string, title: string, materialId: string, prompts: string[]): Quiz {
  return Quiz.create({
    id,
    studentId: 's1',
    materialId,
    title,
    questions: prompts.map((prompt) => ({
      prompt,
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 0,
      explanation: 'Explicacao',
    })),
  });
}

describe('QuizStudySession', () => {
  it('achata o acervo e remove enunciados identicos', () => {
    const quizzes = [
      makeQuiz('q1', 'Quiz: IA', 'mat-ia', ['O que e um LLM?', 'O que e temperature?']),
      makeQuiz('q2', 'Quiz: IA', 'mat-ia', ['O que e um LLM?', 'O que e um transformer?']),
    ];
    const bank = flattenQuizzes(quizzes);
    expect(bank).toHaveLength(3);
  });

  it('prioriza perguntas cujo enunciado cobre tópicos fracos', () => {
    const quizzes = [
      makeQuiz('q1', 'Quiz: Calculo', 'mat-c', ['Qual a derivada de x^2?', 'Qual a integral de 2x?']),
    ];
    const ranked = rankBankByWeakness(flattenQuizzes(quizzes), ['Integrais', 'integral']);
    expect(ranked[0].prompt.toLowerCase()).toContain('integral');
  });

  it('mistura questoes novas com o banco e nao devolve so o primeiro quiz', () => {
    const bankQuiz = makeQuiz('bank', 'Quiz: Calculo', 'mat-c', [
      'Qual a derivada de x^2?',
      'Enuncie o TFC',
    ]);
    const extraQuiz = makeQuiz('extra', 'Sessao Extra: IA', 'mat-ia', [
      'O que e um transformer decoder?',
      'Como o attention mistura tokens?',
    ]);

    const result = composeQuizSession({
      newQuestions: flattenQuizzes([extraQuiz]),
      bankQuestions: flattenQuizzes([bankQuiz]),
      count: 4,
      weakTopics: ['derivada'],
    });

    expect(result.session.length).toBe(4);
    expect(result.newCount).toBe(2);
    expect(result.bankCount).toBe(2);
    const subjects = new Set(result.session.map((q) => q.subject));
    expect(subjects.size).toBeGreaterThanOrEqual(2);
  });
});
