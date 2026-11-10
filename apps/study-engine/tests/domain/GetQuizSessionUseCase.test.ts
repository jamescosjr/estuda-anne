import { describe, it, expect, vi } from 'vitest';
import { GetQuizSessionUseCase } from '../../src/domain/usecases/GetQuizSessionUseCase.js';
import { Quiz } from '../../src/domain/entities/Quiz.js';
import { StudentAdaptiveProfile } from '../../src/domain/entities/StudentAdaptiveProfile.js';

describe('GetQuizSessionUseCase', () => {
  it('le o banco, prioriza topicos fracos e monta um lote intercalado', async () => {
    const studentId = 's1';
    const calc = Quiz.create({
      studentId,
      materialId: 'mat-c',
      title: 'Quiz: Calculo I',
      questions: [
        {
          prompt: 'Qual a integral de 2x?',
          options: ['x^2+C', '2', 'x', '0'],
          correctAnswerIndex: 0,
          explanation: 'Antiderivada.',
        },
        {
          prompt: 'Qual a derivada de x^2?',
          options: ['2x', 'x', '1', '0'],
          correctAnswerIndex: 0,
          explanation: 'Regra do tombo.',
        },
      ],
    });
    const ia = Quiz.create({
      studentId,
      materialId: 'mat-ia',
      title: 'Quiz: Fundamentos de IA',
      questions: [
        {
          prompt: 'O que e um LLM?',
          options: ['Modelo de linguagem', 'Banco', 'PDF', 'CPU'],
          correctAnswerIndex: 0,
          explanation: 'Large Language Model.',
        },
      ],
    });

    const profile = StudentAdaptiveProfile.createDefault(studentId).recordQuizResult([
      { topic: 'integral', isCorrect: false },
      { topic: 'derivada', isCorrect: true },
    ]);

    const useCase = new GetQuizSessionUseCase(
      {
        save: vi.fn(),
        findById: vi.fn(),
        findByMaterialId: vi.fn(),
        findByStudentId: vi.fn().mockResolvedValue([calc, ia]),
        delete: vi.fn(),
        deleteByStudentId: vi.fn(),
      },
      {
        findByStudentId: vi.fn().mockResolvedValue(profile),
        save: vi.fn(),
      }
    );

    const result = await useCase.execute({ studentId, count: 3 });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].prompt.toLowerCase()).toContain('integral');
    expect(result.weakTopics.some((t) => t.toLowerCase().includes('integral'))).toBe(true);
    const subjects = new Set(result.questions.map((q) => q.subject));
    expect(subjects.size).toBeGreaterThanOrEqual(2);
  });

  it('RN_STU_007_WHEN_fetching_quiz_session_SHALL_filter_out_corrupted_file_or_meta_referencing_questions', async () => {
    const studentId = 'anne';
    const hemaQuiz = Quiz.create({
      studentId,
      materialId: 'mat-hema',
      title: 'Quiz: Hematologia I',
      questions: [
        {
          prompt:
            'O que caracteriza um arquivo de dados biomédicos classificado como corrompido ou ilegível nos Sistemas de Informação Laboratorial (LIS) em hematologia?',
          options: [
            'Estrutura de bytes alterada no cabeçalho',
            'Aumento de reticulócitos',
            'Anemia ferropriva',
            'Leucocitose',
          ],
          correctAnswerIndex: 0,
          explanation: 'Falha de leitura binária.',
        },
        {
          prompt: 'Qual hormônio estimula a eritropoiese na medula óssea vermelha?',
          options: ['Eritropoietina', 'Insulina', 'Glucagon', 'Cortisol'],
          correctAnswerIndex: 0,
          explanation: 'Produzida pelos rins.',
        },
      ],
    });

    const useCase = new GetQuizSessionUseCase({
      save: vi.fn(),
      findById: vi.fn(),
      findByMaterialId: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue([hemaQuiz]),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    });

    const result = await useCase.execute({ studentId, count: 5 });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].prompt).toContain('eritropoiese');
    expect(result.questions.some((q) => q.prompt.includes('corrompido'))).toBe(false);
  });
});
