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

    expect(result.cards.map((c) => c.front).join(' ')).not.toMatch(/Card de Revisão/);
    expect(result.cards.some((c) => c.front.includes('transformer'))).toBe(true);
    expect(result.cards.some((c) => c.front.includes('passe compose'))).toBe(true);
  });

  it('filtra a fila pela materia do material, nao pelo conceito da tag', async () => {
    const civil = Flashcard.create({
      studentId: 'lais',
      materialId: 'mat-civil',
      front: 'O que e responsabilidade civil subjetiva?',
      back: 'Culpa ou dolo do agente.',
      tags: ['Culpa'],
    });
    const penal = Flashcard.create({
      studentId: 'lais',
      materialId: 'mat-penal',
      front: 'O que e dolo evental?',
      back: 'Assume o risco do resultado.',
      tags: ['Dolo'],
    });
    const penal2 = Flashcard.create({
      studentId: 'lais',
      materialId: 'mat-penal',
      front: 'O que distingue crime de contravencao?',
      back: 'Gravidade e pena cominada.',
      tags: ['Tipicidade'],
    });

    const useCase = new GetDueFlashcardsUseCase(
      {
        save: vi.fn(),
        saveMany: vi.fn(),
        findById: vi.fn(),
        findByStudentId: vi.fn().mockResolvedValue([civil, penal, penal2]),
        findDueCards: vi.fn().mockResolvedValue([civil, penal, penal2]),
        findByMaterialId: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteByStudentId: vi.fn(),
      },
      {
        save: vi.fn(),
        findById: vi.fn(),
        findByStudentId: vi.fn().mockResolvedValue([
          { id: 'mat-civil', title: 'Apostila Civil', subject: 'Direito Civil', keyConcepts: ['Culpa'] },
          { id: 'mat-penal', title: 'Apostila Penal', subject: 'Direito Penal', keyConcepts: ['Dolo'] },
        ]),
        update: vi.fn(),
        delete: vi.fn(),
        deleteManyByIds: vi.fn(),
      } as any
    );

    const onlyPenal = await useCase.execute({ studentId: 'lais', limit: 20, topic: 'Direito Penal' });
    expect(onlyPenal.cards).toHaveLength(2);
    expect(onlyPenal.cards.every((card) => card.materialId === 'mat-penal')).toBe(true);

    const allSubjects = await useCase.execute({ studentId: 'lais', limit: 20 });
    expect(allSubjects.cards).toHaveLength(3);
  });
});
