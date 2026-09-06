import { describe, it, expect } from 'vitest';
import { StudySchedule } from '../../src/domain/entities/StudySchedule.js';
import { StudyScheduleMapper } from '../../src/infrastructure/persistence/mongo/mappers/StudyScheduleMapper.js';

describe('StudyScheduleMapper', () => {
  it('persiste e reconstitui subject e topic dos itens', () => {
    const schedule = StudySchedule.create({
      studentId: 'usr-anne',
      title: 'Plano do semestre',
    });
    const future = new Date();
    future.setDate(future.getDate() + 3);
    schedule.addItem({
      date: future,
      dailyTargetMinutes: 45,
      subject: 'Calculo I',
      topic: 'Revisao e Pratica de Calculo I',
      materialIds: ['mat-1'],
      flashcardIds: ['fc-1'],
      quizIds: [],
    });

    const persisted = StudyScheduleMapper.toPersistence(schedule);
    expect(persisted.items[0].subject).toBe('Calculo I');
    expect(persisted.items[0].topic).toBe('Revisao e Pratica de Calculo I');

    const restored = StudyScheduleMapper.toDomain(persisted);
    expect(restored.items[0].subject).toBe('Calculo I');
    expect(restored.items[0].topic).toBe('Revisao e Pratica de Calculo I');
  });
});
