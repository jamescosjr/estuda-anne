import { describe, it, expect, vi } from 'vitest';
import { StudySchedule } from '../../src/domain/entities/StudySchedule.js';
import { CompleteScheduleItemUseCase } from '../../src/domain/usecases/CompleteScheduleItemUseCase.js';
import { IStudyScheduleRepository } from '../../src/domain/ports/index.js';

describe('CompleteScheduleItemUseCase', () => {
  it('marca item como concluido e persiste o plano ativo da aluna', async () => {
    const schedule = StudySchedule.create({
      studentId: 'usr-anne',
      title: 'Plano',
    });
    const date = new Date();
    date.setDate(date.getDate() + 1);
    schedule.addItem({
      date,
      dailyTargetMinutes: 45,
      subject: 'Calculo I',
      topic: 'Revisao',
      materialIds: [],
      flashcardIds: [],
      quizIds: [],
    });
    const itemId = schedule.items[0].id;

    const scheduleRepository: IStudyScheduleRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn().mockResolvedValue(schedule),
      update: vi.fn().mockResolvedValue(undefined),
      deleteByStudentId: vi.fn(),
    };

    const useCase = new CompleteScheduleItemUseCase(scheduleRepository);
    const result = await useCase.execute({ studentId: 'usr-anne', itemId });

    expect(result.items[0].completed).toBe(true);
    expect(scheduleRepository.update).toHaveBeenCalledTimes(1);
  });
});
