import { describe, it, expect, vi } from 'vitest';
import { GenerateStudyScheduleUseCase } from '../../src/domain/usecases/GenerateStudyScheduleUseCase.js';
import { Material } from '../../src/domain/entities/Material.js';
import { Flashcard } from '../../src/domain/entities/Flashcard.js';
import {
  IStudyScheduleRepository,
  IMaterialRepository,
  IFlashcardRepository,
} from '../../src/domain/ports/index.js';

function futureExamDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}

describe('GenerateStudyScheduleUseCase', () => {
  it('grava um plano com subject/topic e usa limite de flashcards', async () => {
    const material = Material.create({
      studentId: 'usr-anne',
      title: 'Apostila',
      format: 'PDF',
      fileUrl: 'https://r2.estuda-anne.local/a.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    const flashcard = Flashcard.create({
      studentId: 'usr-anne',
      materialId: material.id,
      front: 'O que e derivada?',
      back: 'Taxa de variacao',
    });

    const scheduleRepository: IStudyScheduleRepository = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const materialRepository: IMaterialRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue([material]),
      update: vi.fn(),
      delete: vi.fn(),
      deleteManyByIds: vi.fn(),
    };

    const flashcardRepository: IFlashcardRepository = {
      save: vi.fn(),
      saveMany: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue([flashcard]),
      findDueCards: vi.fn().mockResolvedValue([flashcard]),
      findByMaterialId: vi.fn(),
      delete: vi.fn(),
      deleteByStudentId: vi.fn(),
    };

    const useCase = new GenerateStudyScheduleUseCase(
      scheduleRepository,
      materialRepository,
      flashcardRepository
    );

    const schedule = await useCase.execute({
      studentId: 'usr-anne',
      title: 'Cronograma — Engenharia',
      subjects: ['Calculo I'],
      examDates: [{ subject: 'Calculo I', title: 'P1', date: futureExamDate().toISOString() }],
      dailyStudyMinutesTarget: 45,
    });

    expect(scheduleRepository.save).toHaveBeenCalledTimes(1);
    expect(flashcardRepository.findDueCards).toHaveBeenCalled();
    expect(schedule.items.length).toBeGreaterThan(0);
    expect(schedule.items.some((item) => item.subject === 'Calculo I')).toBe(true);
    expect(schedule.items.some((item) => item.topic?.includes('Calculo I'))).toBe(true);
  });
});
