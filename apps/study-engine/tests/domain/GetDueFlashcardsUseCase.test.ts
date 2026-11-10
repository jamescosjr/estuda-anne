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

  it('descarta flashcards de materias fora de allowedSubjects (ex: Calculo 1 da aluna Lais)', async () => {
    const calculo = Flashcard.create({
      studentId: 'lais',
      materialId: 'mat-calc',
      front: 'Qual a derivada de x^2?',
      back: '2x',
      tags: ['Cálculo 1'],
    });
    const anatomia = Flashcard.create({
      studentId: 'lais',
      materialId: 'mat-anat',
      front: 'Quais os ossos do antebraço?',
      back: 'Rádio e Ulna',
      tags: ['Anatomia'],
    });

    const useCase = new GetDueFlashcardsUseCase(
      {
        save: vi.fn(),
        saveMany: vi.fn(),
        findById: vi.fn(),
        findByStudentId: vi.fn().mockResolvedValue([calculo, anatomia]),
        findDueCards: vi.fn().mockResolvedValue([calculo, anatomia]),
        findByMaterialId: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteByStudentId: vi.fn(),
      },
      {
        save: vi.fn(),
        findById: vi.fn(),
        findByStudentId: vi.fn().mockResolvedValue([
          { id: 'mat-calc', title: 'Limites e Derivadas', subject: 'Cálculo 1', keyConcepts: ['Derivadas'] },
          { id: 'mat-anat', title: 'Sistema Esquelético', subject: 'Anatomia', keyConcepts: ['Ossos'] },
        ]),
        update: vi.fn(),
        delete: vi.fn(),
        deleteManyByIds: vi.fn(),
      } as any
    );

    const result = await useCase.execute({
      studentId: 'lais',
      allowedSubjects: ['Anatomia', 'Fisiologia'],
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toContain('antebraço');
    expect(result.cards.some((c) => c.front.includes('derivada'))).toBe(false);
  });

  it('RN_STU_007_WHEN_fetching_due_flashcards_SHALL_filter_out_corrupted_file_or_meta_referencing_cards_from_bank', async () => {
    const validHema = Flashcard.create({
      studentId: 'anne',
      materialId: 'mat-hema',
      front: 'Onde ocorre a eritropoiese e qual hormônio a estimula?',
      back: 'Ocorre na medula óssea vermelha sob estímulo da eritropoietina renal.',
      tags: ['Hematologia I'],
    });
    const corruptedHema = Flashcard.create({
      studentId: 'anne',
      materialId: 'mat-hema',
      front:
        'O que caracteriza um arquivo de dados biomédicos classificado como corrompido ou ilegível nos Sistemas de Informação Laboratorial (LIS) em hematologia?',
      back:
        'Um arquivo corrompido ou ilegível é aquele cuja estrutura de bytes original sofreu alteração involuntária ou degradação de dados, impedindo que os softwares analíticos interpretem seu cabeçalho ou conteúdo.',
      tags: ['Hematologia I'],
    });

    const useCase = new GetDueFlashcardsUseCase({
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue([validHema, corruptedHema]),
      findDueCards: vi.fn().mockResolvedValue([validHema, corruptedHema]),
      findByMaterialId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    });

    const result = await useCase.execute({ studentId: 'anne', limit: 10 });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toContain('eritropoiese');
    expect(result.cards.some((c) => c.front.includes('corrompido') || c.back.includes('estrutura de bytes'))).toBe(
      false
    );
  });
});
