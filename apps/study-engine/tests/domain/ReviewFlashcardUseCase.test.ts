import { describe, it, expect, vi } from 'vitest';
import { ReviewFlashcardUseCase } from '../../src/domain/usecases/ReviewFlashcardUseCase.js';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';
import { NotFoundError } from '../../src/domain/errors/DomainError.js';
import { IFlashcardRepository } from '../../src/domain/ports/IFlashcardRepository.js';

describe('ReviewFlashcardUseCase', () => {
  it('lanca NotFoundError 404 quando o id nao existe', async () => {
    const repo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const useCase = new ReviewFlashcardUseCase(repo);

    await expect(
      useCase.execute({
        flashcardId: 'fc-gen-Fundamentos de IA e LLMs para Programadores-1',
        grade: 5,
      })
    ).rejects.toMatchObject({
      name: 'NotFound',
      statusCode: 404,
    });
    await expect(
      useCase.execute({
        flashcardId: 'missing',
        grade: 5,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('aplica revisao quando o card existe', async () => {
    const card = Flashcard.create({
      studentId: 's1',
      materialId: 'm1',
      front: 'O que e um LLM?',
      back: 'Modelo de linguagem de grande escala.',
    });
    const repo: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn().mockResolvedValue(card),
      findByStudentId: vi.fn(),
      findDueCards: vi.fn(),
      findByMaterialId: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const useCase = new ReviewFlashcardUseCase(repo);
    const result = await useCase.execute({ flashcardId: card.id, grade: 5 });

    expect(result.flashcardId).toBe(card.id);
    expect(result.repetitionsCount).toBe(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
