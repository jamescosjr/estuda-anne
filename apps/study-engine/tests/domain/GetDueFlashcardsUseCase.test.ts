import { describe, it, expect, vi } from 'vitest';
import { GetDueFlashcardsUseCase } from '../../src/domain/usecases/GetDueFlashcardsUseCase.js';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';

describe('GetDueFlashcardsUseCase', () => {
  it('completa a fila com o acervo persistido e descarta placeholders genericos', async () => {
    const realDue = Flashcard.create({
      studentId: 's1',
      materialId: 'mat-ia',
      front: 'O que e um transformer decoder?',
      back: 'Arquitetura de atencao para proximo token.',
      tags: ['IA'],
    });
    const placeholder = Flashcard.create({
      studentId: 's1',
      materialId: 'mat-fr',
      front:
        '[Card de Revisão — Francês #2] Quais são as aplicações práticas essenciais de Francês no aprendizado universitário?',
      back: 'Placeholder.',
      tags: ['Francês'],
    });
    const bankExtra = Flashcard.create({
      studentId: 's1',
      materialId: 'mat-fr',
      front: 'Como se forma o passe compose em frances?',
      back: 'Avoir ou etre + particípio passado.',
      tags: ['Francês'],
    });

    const useCase = new GetDueFlashcardsUseCase({
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue([realDue, placeholder, bankExtra]),
      findDueCards: vi.fn().mockResolvedValue([realDue, placeholder]),
      findByMaterialId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    });

    const result = await useCase.execute({ studentId: 's1', limit: 5 });

    expect(result.map((c) => c.front).join(' ')).not.toMatch(/Card de Revisão/);
    expect(result.some((c) => c.front.includes('transformer'))).toBe(true);
    expect(result.some((c) => c.front.includes('passe compose'))).toBe(true);
  });
});
