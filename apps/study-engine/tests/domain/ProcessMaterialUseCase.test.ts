import { describe, it, expect, vi } from 'vitest';
import { Material } from '../../src/domain/entities/Material.js';
import { ProcessMaterialUseCase } from '../../src/domain/usecases/ProcessMaterialUseCase.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
  ITranscriptionService,
} from '../../src/domain/ports/index.js';

describe('ProcessMaterialUseCase', () => {
  it('should orchestrate AI analysis, flashcard generation, and quiz creation for a material', async () => {
    const material = Material.create({
      id: 'mat-001',
      studentId: 'student-001',
      title: 'Aula 1 - Direito Constitucional',
      format: 'PDF',
      fileUrl: 'https://storage.estuda-anne.com/aula1.pdf',
      fileSizeBytes: 102400,
      mimeType: 'application/pdf',
    });
    material.setRawContent('Os princípios fundamentais da República Federativa do Brasil incluem a cidadania e a dignidade.');

    // In-memory / Mock implementations of ports
    const materialRepo: IMaterialRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(material),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const flashcardRepo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const quizRepo: IQuizRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByMaterialId: vi.fn(),
      findByStudentId: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const aiService: ILanguageModelService = {
      extractConceptsAndSummary: vi.fn().mockResolvedValue({
        summary: 'Resumo sobre princípios fundamentais e soberania.',
        keyConcepts: ['soberania', 'cidadania', 'dignidade'],
      }),
      generateFlashcards: vi.fn().mockResolvedValue([
        { front: 'Quais são os princípios?', back: 'Cidadania, dignidade e pluralismo.' },
      ]),
      generateQuizQuestions: vi.fn().mockResolvedValue([
        {
          prompt: 'Qual destes é fundamento da República?',
          options: ['Cidadania', 'Monarquia', 'Tirania', 'Anarquia'],
          correctAnswerIndex: 0,
          explanation: 'Art. 1º da CF/88.',
        },
      ]),
    };

    const transcriptionService: ITranscriptionService = {
      transcribe: vi.fn(),
    };

    const useCase = new ProcessMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      aiService,
      transcriptionService
    );

    const result = await useCase.execute({ materialId: 'mat-001' });

    expect(result.status).toBe('READY');
    expect(result.summary).toContain('Resumo sobre princípios fundamentais');
    expect(result.keyConcepts).toContain('soberania');
    expect(result.generatedFlashcardsCount).toBe(1);
    expect(result.generatedQuizId).toBeDefined();

    expect(flashcardRepo.saveMany).toHaveBeenCalledTimes(1);
    expect(quizRepo.save).toHaveBeenCalledTimes(1);
    expect(materialRepo.update).toHaveBeenCalled();
  });

  it('usa textContent quando o material ainda nao tem rawContent', async () => {
    const material = Material.create({
      id: 'mat-002',
      studentId: 'usr-177-anne',
      title: 'Notas enviadas no process',
      format: 'PDF',
      fileUrl: 'https://storage.estuda-anne.com/notas.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
    });

    const materialRepo: IMaterialRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(material),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteManyByIds: vi.fn(),
    };

    const flashcardRepo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const quizRepo: IQuizRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const aiService: ILanguageModelService = {
      extractConceptsAndSummary: vi.fn().mockResolvedValue({
        summary: 'Resumo gerado a partir do textContent enviado no process.',
        keyConcepts: ['cidadania'],
      }),
      generateFlashcards: vi.fn().mockResolvedValue([
        { front: 'O que e cidadania?', back: 'Fundamento da Republica.' },
      ]),
      generateQuizQuestions: vi.fn().mockResolvedValue([
        {
          prompt: 'Qual e um fundamento?',
          options: ['Cidadania', 'Monarquia', 'Tirania', 'Anarquia'],
          correctAnswerIndex: 0,
          explanation: 'Art. 1 da CF.',
        },
      ]),
    };

    const useCase = new ProcessMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      aiService,
      { transcribe: vi.fn() }
    );

    const result = await useCase.execute({
      materialId: 'mat-002',
      textContent: 'Os principios fundamentais incluem a cidadania e a dignidade da pessoa humana.',
    });

    expect(result.status).toBe('READY');
    expect(aiService.extractConceptsAndSummary).toHaveBeenCalled();
    expect(material.rawContent).toContain('cidadania');
  });

  it('nao reprocessa material ja READY sem force', async () => {
    const material = Material.create({
      id: 'mat-ready',
      studentId: 'usr-anne',
      title: 'Ja processado',
      format: 'PDF',
      fileUrl: 'https://storage.estuda-anne.com/ok.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    material.setRawContent('Conteudo ja indexado da apostila de calculo.');
    material.completeProcessing('Resumo existente', ['derivada']);

    const aiService: ILanguageModelService = {
      extractConceptsAndSummary: vi.fn(),
      generateFlashcards: vi.fn(),
      generateQuizQuestions: vi.fn(),
    };

    const materialRepo: IMaterialRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(material),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteManyByIds: vi.fn(),
    };

    const flashcardRepo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const quizRepo: IQuizRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const useCase = new ProcessMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      aiService,
      { transcribe: vi.fn() }
    );

    const result = await useCase.execute({ materialId: 'mat-ready' });

    expect(result.status).toBe('READY');
    expect(aiService.extractConceptsAndSummary).not.toHaveBeenCalled();
  });

  it('deve orquestrar criacao e delecao do Gemini Context Cache durante o processamento', async () => {
    const material = Material.create({
      id: 'mat-cache-01',
      studentId: 'usr-anne',
      title: 'Aula de Fisica Quantica',
      format: 'PDF',
      fileUrl: 'https://storage.estuda-anne.com/fisica.pdf',
      fileSizeBytes: 2048,
      mimeType: 'application/pdf',
    });
    material.setRawContent('O principio da incerteza de Heisenberg estabelece limites para a precisao de medidas simultaneas de posicao e momento.');

    const mockCacheHandle = {
      cache: { name: 'cachedContents/fisica-cache-123', model: 'models/gemini-1.5-flash-001' },
      file: { name: 'files/fisica-file-123' },
    };

    const materialRepo: IMaterialRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(material),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteManyByIds: vi.fn(),
    };

    const flashcardRepo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const quizRepo: IQuizRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByMaterialId: vi.fn().mockResolvedValue([]),
      findByStudentId: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const aiService: ILanguageModelService = {
      createContextCache: vi.fn().mockResolvedValue(mockCacheHandle),
      deleteContextCache: vi.fn().mockResolvedValue(undefined),
      extractConceptsAndSummary: vi.fn().mockResolvedValue({
        summary: 'Resumo sobre principio da incerteza.',
        keyConcepts: ['incerteza', 'heisenberg'],
      }),
      generateFlashcards: vi.fn().mockResolvedValue([
        { front: 'O que e incerteza?', back: 'Impossibilidade de medir simultaneamente posicao e momento.' },
      ]),
      generateQuizQuestions: vi.fn().mockResolvedValue([
        {
          prompt: 'O que estabelece o principio de Heisenberg?',
          options: ['Limites de precisao', 'Gravidade universal', 'Relatividade restrita', 'Entropia max'],
          correctAnswerIndex: 0,
          explanation: 'Principio da Incerteza.',
        },
      ]),
    };

    const useCase = new ProcessMaterialUseCase(
      materialRepo,
      flashcardRepo,
      quizRepo,
      aiService,
      { transcribe: vi.fn() }
    );

    const result = await useCase.execute({
      materialId: 'mat-cache-01',
      fileBase64: 'JVBERi0xLjQK...',
      mimeType: 'application/pdf',
      fileName: 'fisica.pdf',
    });

    expect(result.status).toBe('READY');
    expect(aiService.createContextCache).toHaveBeenCalledWith({
      mimeType: 'application/pdf',
      dataBase64: 'JVBERi0xLjQK...',
      textContent: expect.stringContaining('Heisenberg'),
      fileName: 'fisica.pdf',
    });
    expect(aiService.extractConceptsAndSummary).toHaveBeenCalledWith(
      expect.any(String),
      { cacheHandle: mockCacheHandle }
    );
    expect(aiService.generateFlashcards).toHaveBeenCalledWith(
      expect.any(String),
      5,
      [],
      expect.any(Array),
      { cacheHandle: mockCacheHandle, keyConcepts: ['incerteza', 'heisenberg'] }
    );
    expect(aiService.generateQuizQuestions).toHaveBeenCalledWith(
      expect.any(String),
      4,
      [],
      expect.any(Array),
      { cacheHandle: mockCacheHandle }
    );
    expect(aiService.deleteContextCache).toHaveBeenCalledWith(mockCacheHandle);
  });
});
