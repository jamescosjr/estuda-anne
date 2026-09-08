import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateExtraSessionUseCase } from '../../src/domain/usecases/GenerateExtraSessionUseCase.js';
import { StudentAdaptiveProfile } from '../../src/domain/entities/StudentAdaptiveProfile.js';
import { Material } from '../../src/domain/entities/Material.js';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';
import { Quiz } from '../../src/domain/entities/Quiz.js';

describe('GenerateExtraSessionUseCase', () => {
  let mockMaterialRepository: any;
  let mockFlashcardRepository: any;
  let mockQuizRepository: any;
  let mockAiService: any;
  let mockProfileRepository: any;

  beforeEach(() => {
    mockMaterialRepository = {
      findByStudentId: vi.fn(),
      findById: vi.fn(),
    };
    mockFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn().mockResolvedValue([]),
      findDueCards: vi.fn().mockResolvedValue([]),
    };
    mockQuizRepository = {
      save: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn().mockResolvedValue([]),
    };
    mockAiService = {
      generateFlashcards: vi.fn(),
      generateQuizQuestions: vi.fn(),
    };
    mockProfileRepository = {
      findByStudentId: vi.fn(),
    };
  });

  it('deve utilizar os tópicos fracos do perfil adaptativo do estudante para gerar flashcards e quizzes direcionados', async () => {
    const studentId = 'anne-student-1';

    const material = Material.reconstitute({
      id: 'mat-1',
      studentId,
      title: 'Cálculo e Álgebra',
      summary: 'Resumo de Cálculo',
      keyConcepts: ['Derivadas', 'Integrais', 'Matrizes'],
      rawContent: 'Conteúdo de Cálculo e Integrais...',
      format: 'TEXT',
      fileUrl: 'https://storage/mat-1.pdf',
      fileSizeBytes: 1024,
      mimeType: 'text/plain',
      status: 'PROCESSED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = StudentAdaptiveProfile.createDefault(studentId);
    const updatedProfile = profile.recordQuizResult([
      { topic: 'Integrais', isCorrect: false },
      { topic: 'Derivadas', isCorrect: true },
    ]);

    mockMaterialRepository.findByStudentId.mockResolvedValue([material]);
    mockProfileRepository.findByStudentId.mockResolvedValue(updatedProfile);

    mockAiService.generateFlashcards.mockResolvedValue([
      { front: 'Qual a integral de 2x?', back: 'x^2 + C' },
    ]);

    mockAiService.generateQuizQuestions.mockResolvedValue([
      {
        prompt: 'Qual a integral de 2x?',
        options: ['x^2 + C', '2', 'x', '2x^2'],
        correctAnswerIndex: 0,
        explanation: 'Antiderivada de 2x é x^2.',
      },
    ]);

    const useCase = new GenerateExtraSessionUseCase(
      mockMaterialRepository,
      mockFlashcardRepository,
      mockQuizRepository,
      mockAiService,
      mockProfileRepository
    );

    const result = await useCase.execute({ studentId });

    expect(mockMaterialRepository.findByStudentId).toHaveBeenCalledWith(studentId);
    expect(mockProfileRepository.findByStudentId).toHaveBeenCalledWith(studentId);
    expect(mockFlashcardRepository.saveMany).toHaveBeenCalled();
    expect(mockQuizRepository.save).toHaveBeenCalled();

    expect(result.generatedFlashcardsCount).toBe(1);
    expect(result.flashcards).toHaveLength(1);
    expect(result.quiz).not.toBeNull();
    expect(result.weakTopics).toContain('Integrais');
  });

  it('deve lidar adequadamente quando não houver perfil adaptativo previo registrado', async () => {
    const studentId = 'anne-student-2';

    const material = Material.reconstitute({
      id: 'mat-2',
      studentId,
      title: 'Biologia Celular',
      summary: 'Resumo de Biologia',
      keyConcepts: ['Mitocôndria', 'Ribossomo'],
      rawContent: 'Conteúdo de biologia...',
      format: 'TEXT',
      fileUrl: 'https://storage/mat-2.pdf',
      fileSizeBytes: 2048,
      mimeType: 'text/plain',
      status: 'PROCESSED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockMaterialRepository.findByStudentId.mockResolvedValue([material]);
    mockProfileRepository.findByStudentId.mockResolvedValue(null);

    mockAiService.generateFlashcards.mockResolvedValue([
      { front: 'Qual a função da Mitocôndria?', back: 'Produção de ATP' },
    ]);

    mockAiService.generateQuizQuestions.mockResolvedValue([
      {
        prompt: 'Onde ocorre a respiração celular?',
        options: ['Mitocôndria', 'Núcleo', 'Lisossomo', 'Votíolo'],
        correctAnswerIndex: 0,
        explanation: 'Mitocôndria é a organela responsável pela respiração celular.',
      },
    ]);

    const useCase = new GenerateExtraSessionUseCase(
      mockMaterialRepository,
      mockFlashcardRepository,
      mockQuizRepository,
      mockAiService,
      mockProfileRepository
    );

    const result = await useCase.execute({ studentId });

    expect(result.generatedFlashcardsCount).toBe(1);
    expect(result.quiz).not.toBeNull();
    expect(result.weakTopics).toEqual([]);
  });

  it('gera cards em todos os materiais e mistura com a fila due de outras materias', async () => {
    const studentId = 'anne-student-3';
    const ia = Material.reconstitute({
      id: 'mat-ia',
      studentId,
      title: 'Fundamentos de IA e LLMs para Programadores',
      summary: 'LLMs',
      keyConcepts: ['LLM', 'prompt'],
      rawContent: 'Um LLM prediz o proximo token.',
      format: 'TEXT',
      fileUrl: 'https://storage/ia.pdf',
      fileSizeBytes: 1024,
      mimeType: 'text/plain',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const calc = Material.reconstitute({
      id: 'mat-calc',
      studentId,
      title: 'Calculo I',
      summary: 'Derivadas',
      keyConcepts: ['derivada'],
      rawContent: 'A derivada e a taxa de variacao.',
      format: 'TEXT',
      fileUrl: 'https://storage/calc.pdf',
      fileSizeBytes: 1024,
      mimeType: 'text/plain',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockMaterialRepository.findByStudentId.mockResolvedValue([ia, calc]);
    mockProfileRepository.findByStudentId.mockResolvedValue(null);
    mockAiService.generateFlashcards.mockImplementation(async (content: string) => {
      if (String(content).includes('LLM')) {
        return [{ front: 'O que e um transformer decoder?', back: 'Arquitetura de atencao para tokens.' }];
      }
      return [{ front: 'Como interpretar geometricamente a derivada?', back: 'Inclinacao da reta tangente.' }];
    });
    mockAiService.generateQuizQuestions.mockResolvedValue([]);
    mockFlashcardRepository.findDueCards.mockResolvedValue([
      Flashcard.create({
        studentId,
        materialId: 'mat-bio',
        front: 'O que e a glicolise?',
        back: 'Quebra da glicose em piruvato.',
        tags: ['Bioquimica'],
      }),
    ]);

    const useCase = new GenerateExtraSessionUseCase(
      mockMaterialRepository,
      mockFlashcardRepository,
      mockQuizRepository,
      mockAiService,
      mockProfileRepository
    );

    const result = await useCase.execute({
      studentId,
      targetType: 'flashcards',
      count: 5,
    });

    expect(result.generatedFlashcardsCount).toBeGreaterThanOrEqual(2);
    expect(result.flashcards.length).toBeGreaterThanOrEqual(3);
    expect(result.mixedDueCount).toBeGreaterThanOrEqual(1);
    const fronts = result.flashcards.map((c) => c.front);
    expect(fronts.some((f) => f.includes('transformer') || f.includes('derivada') || f.includes('glicolise'))).toBe(true);
  });

  it('mistura questoes novas com o acervo persistido e prioriza topicos fracos', async () => {
    const studentId = 'anne-student-quiz';
    const material = Material.reconstitute({
      id: 'mat-ia',
      studentId,
      title: 'Fundamentos de IA e LLMs para Programadores',
      summary: 'LLMs',
      keyConcepts: ['LLM'],
      rawContent: 'Um LLM prediz o proximo token.',
      format: 'TEXT',
      fileUrl: 'https://storage/ia.pdf',
      fileSizeBytes: 1024,
      mimeType: 'text/plain',
      status: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const bankQuiz = Quiz.create({
      studentId,
      materialId: 'mat-calc',
      title: 'Quiz: Calculo I',
      questions: [
        {
          prompt: 'Qual a integral definida de 2x de 0 a 3?',
          options: ['9', '6', '3', '0'],
          correctAnswerIndex: 0,
          explanation: 'x^2.',
        },
      ],
    });

    mockMaterialRepository.findByStudentId.mockResolvedValue([material]);
    mockQuizRepository.findByStudentId.mockResolvedValue([bankQuiz]);
    mockQuizRepository.findByMaterialId.mockResolvedValue([]);
    mockProfileRepository.findByStudentId.mockResolvedValue(
      StudentAdaptiveProfile.createDefault(studentId).recordQuizResult([
        { topic: 'integral', isCorrect: false },
      ])
    );
    mockAiService.generateQuizQuestions.mockResolvedValue([
      {
        prompt: 'O que caracteriza um transformer decoder?',
        options: ['Atencao', 'Arvore', 'Pilha', 'Fila'],
        correctAnswerIndex: 0,
        explanation: 'Mecanismo de atencao.',
      },
    ]);

    const useCase = new GenerateExtraSessionUseCase(
      mockMaterialRepository,
      mockFlashcardRepository,
      mockQuizRepository,
      mockAiService,
      mockProfileRepository
    );

    const result = await useCase.execute({
      studentId,
      targetType: 'quiz',
      count: 5,
    });

    expect(result.newQuestionIds.length).toBeGreaterThanOrEqual(1);
    expect(result.mixedBankCount).toBeGreaterThanOrEqual(1);
    expect(result.sessionQuestions.length).toBeGreaterThanOrEqual(2);
    expect(result.weakTopics.some((t) => t.toLowerCase().includes('integral'))).toBe(true);
  });
});
