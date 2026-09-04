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
    };

    const quizRepo: IQuizRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByMaterialId: vi.fn(),
      findByStudentId: vi.fn(),
      delete: vi.fn(),
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
});
