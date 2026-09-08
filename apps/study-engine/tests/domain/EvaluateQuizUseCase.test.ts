import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Quiz } from '../../src/domain/entities/Quiz.js';
import { StudentAdaptiveProfile } from '../../src/domain/entities/StudentAdaptiveProfile.js';
import { EvaluateQuizUseCase } from '../../src/domain/usecases/EvaluateQuizUseCase.js';
import { IQuizRepository } from '../../src/domain/ports/IQuizRepository.js';

describe('EvaluateQuizUseCase & Mecânica de Pesos Adaptativos', () => {
  let mockQuizRepository: IQuizRepository;
  let mockProfileRepository: any;

  beforeEach(() => {
    mockQuizRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    mockProfileRepository = {
      findByStudentId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
  });

  it('deve avaliar um quiz, recalcular os pesos por tópico e identificar áreas fracas', async () => {
    const quiz = Quiz.create({
      id: 'quiz-test-123',
      studentId: 'anne-test-student',
      materialId: 'mat-test-1',
      title: 'Quiz de Cálculo I',
      questions: [
        {
          id: 'q-1',
          prompt: 'Qual a derivada de x^2?',
          options: ['2x', 'x', 'x^3', '2'],
          correctAnswerIndex: 0,
          explanation: 'Regra do tombo: d/dx(x^n) = n*x^(n-1)',
        },
        {
          id: 'q-2',
          prompt: 'Qual a integral de 1/x?',
          options: ['ln|x| + C', 'x^2', 'e^x', '1'],
          correctAnswerIndex: 0,
          explanation: 'A antiderivada de 1/x é o logaritmo natural ln|x|.',
        },
      ],
    });

    vi.spyOn(mockQuizRepository, 'findById').mockResolvedValue(quiz);

    const useCase = new EvaluateQuizUseCase(mockQuizRepository, mockProfileRepository);

    const result = await useCase.execute({
      quizId: 'quiz-test-123',
      studentId: 'anne-test-student',
      answers: [
        { questionId: 'q-1', selectedOptionIndex: 0, topic: 'Derivadas' }, // Correto
        { questionId: 'q-2', selectedOptionIndex: 2, topic: 'Integrais' }, // Incorreto
      ],
    });

    expect(result.evaluation.scorePercentage).toBe(50);
    expect(result.adaptiveProfile.topicWeights['Integrais'].wrong).toBe(1);
    expect(result.adaptiveProfile.topicWeights['Integrais'].priorityWeight).toBeGreaterThan(1.5);
    expect(result.adaptiveProfile.weakTopics).toContain('Integrais');
    expect(mockProfileRepository.save).toHaveBeenCalledOnce();
  });

  it('lanca NotFoundError 404 quando o quiz nao existe', async () => {
    mockQuizRepository.findById = vi.fn().mockResolvedValue(null);
    const useCase = new EvaluateQuizUseCase(mockQuizRepository, mockProfileRepository);

    await expect(
      useCase.execute({
        quizId: 'qz-gen-demo-1',
        studentId: 'anne-test-student',
        answers: [{ questionId: 'q-1', selectedOptionIndex: 0 }],
      })
    ).rejects.toMatchObject({ statusCode: 404, name: 'NotFound' });
  });
});
