import { describe, it, expect } from 'vitest';
import { GenerateScheduleBodySchema } from '../../src/application/dto/schedule.dto.js';

describe('GenerateScheduleBodySchema', () => {
  it('ignora datas vazias enviadas pelo perfil', () => {
    const parsed = GenerateScheduleBodySchema.parse({
      studentId: 'usr-1770000000000-abc12',
      title: 'Cronograma — Engenharia',
      subjects: ['Calculo I'],
      periodStartDate: '',
      periodEndDate: '',
      targetExamDate: '',
      examDates: [{ subject: 'Calculo I', title: 'P1', date: '' }],
      dailyStudyMinutesTarget: 45,
    });

    expect(parsed.periodStartDate).toBeUndefined();
    expect(parsed.periodEndDate).toBeUndefined();
    expect(parsed.targetExamDate).toBeUndefined();
    expect(parsed.examDates).toEqual([]);
  });
});
