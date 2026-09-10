import { describe, it, expect } from 'vitest';
import { GetStudentMetricsUseCase } from '../src/domain/usecases/GetStudentMetricsUseCase.js';
import {
  IMetricsRepository,
  ScheduleRaw,
  FlashcardRaw,
  MaterialRaw,
} from '../src/domain/ports/IMetricsRepository.js';

class InMemoryMetricsRepository implements IMetricsRepository {
  public schedules: ScheduleRaw[] = [];
  public flashcards: FlashcardRaw[] = [];
  public materials: MaterialRaw[] = [];

  async getSchedulesByStudentId(studentId: string): Promise<ScheduleRaw[]> {
    return this.schedules.filter((s) => s.studentId === studentId);
  }

  async getFlashcardsByStudentId(studentId: string): Promise<FlashcardRaw[]> {
    return this.flashcards.filter((f) => f.studentId === studentId);
  }

  async getMaterialsByStudentId(studentId: string): Promise<MaterialRaw[]> {
    return this.materials.filter((m) => m.studentId === studentId);
  }
}

describe('GetStudentMetricsUseCase', () => {
  it('deve lançar erro se studentId não for fornecido', async () => {
    const repo = new InMemoryMetricsRepository();
    const usecase = new GetStudentMetricsUseCase(repo);
    await expect(usecase.execute({ studentId: '' })).rejects.toThrow(
      'studentId é obrigatório'
    );
  });

  it('deve retornar status SEM_CRONOGRAMA para estudante sem itens agendados', async () => {
    const repo = new InMemoryMetricsRepository();
    const usecase = new GetStudentMetricsUseCase(repo);
    const metrics = await usecase.execute({ studentId: 'student-1' });

    expect(metrics.scheduleAdherence.status).toBe('SEM_CRONOGRAMA');
    expect(metrics.pendingSummary.totalPendingCount).toBe(0);
    expect(metrics.pendingSummary.overdueScheduleCount).toBe(0);
  });

  it('deve identificar tarefas em atraso no cronograma quando data <= hoje e não concluídas', async () => {
    const repo = new InMemoryMetricsRepository();
    const now = new Date('2026-09-10T12:00:00Z');
    const pastDate = new Date('2026-09-08T10:00:00Z');

    repo.schedules = [
      {
        id: 'sched-1',
        studentId: 'student-1',
        title: 'Cronograma Semestral',
        items: [
          {
            id: 'item-1',
            date: pastDate,
            subject: 'Quality Assurance',
            topic: 'Testes de Regressão',
            dailyTargetMinutes: 45,
            completed: false,
          },
          {
            id: 'item-2',
            date: now,
            subject: 'Quality Assurance',
            topic: 'Testes de Carga',
            dailyTargetMinutes: 30,
            completed: true,
            completedAt: now,
          },
        ],
      },
    ];

    const usecase = new GetStudentMetricsUseCase(repo);
    const metrics = await usecase.execute({ studentId: 'student-1', asOfDate: now });

    expect(metrics.scheduleAdherence.status).toBe('ATRASADO');
    expect(metrics.pendingSummary.overdueScheduleCount).toBe(1);
    expect(metrics.pendingSummary.items.length).toBeGreaterThanOrEqual(1);

    const overdueItem = metrics.pendingSummary.items.find((i) => i.id === 'item-1');
    expect(overdueItem).toBeDefined();
    expect(overdueItem?.subject).toBe('Quality Assurance');
    expect(overdueItem?.title).toBe('Testes de Regressão');
    expect(overdueItem?.isOverdue).toBe(true);
  });

  it('deve calcular corretamente a velocidade de estudo e o streak', async () => {
    const repo = new InMemoryMetricsRepository();
    const now = new Date('2026-09-10T12:00:00Z');

    repo.schedules = [
      {
        id: 'sched-1',
        studentId: 'student-1',
        title: 'Cronograma Semestral',
        items: [
          {
            id: 'item-1',
            date: new Date('2026-09-09T14:00:00Z'),
            subject: 'Engenharia de Software',
            topic: 'DDD Linear',
            dailyTargetMinutes: 60,
            completed: true,
            completedAt: new Date('2026-09-09T15:00:00Z'),
          },
          {
            id: 'item-2',
            date: now,
            subject: 'Engenharia de Software',
            topic: 'Arquitetura de Microserviços',
            dailyTargetMinutes: 45,
            completed: true,
            completedAt: now,
          },
        ],
      },
    ];

    const usecase = new GetStudentMetricsUseCase(repo);
    const metrics = await usecase.execute({ studentId: 'student-1', asOfDate: now });

    expect(metrics.evolutionary.studyStreakDays).toBe(2);
    expect(metrics.evolutionary.weeklyVelocity.length).toBe(7);
  });

  it('deve ignorar matérias removidas/antigas quando input.subjects for especificado', async () => {
    const repo = new InMemoryMetricsRepository();
    const now = new Date('2026-09-10T12:00:00Z');

    repo.materials = [
      { id: 'mat-1', studentId: 'james-1', title: 'Anotações IA', subject: 'Fundamentos de IA e LLMs para Programadores' },
      { id: 'mat-2', studentId: 'james-1', title: 'Anotações Francês', subject: 'Francês' },
    ];

    repo.schedules = [
      {
        id: 'sched-1',
        studentId: 'james-1',
        title: 'Cronograma',
        items: [
          {
            id: 'item-ia',
            date: new Date('2026-09-08T10:00:00Z'),
            subject: 'Fundamentos de IA e LLMs para Programadores',
            topic: 'Prompts Avançados',
            completed: false,
          },
          {
            id: 'item-frances',
            date: new Date('2026-09-08T10:00:00Z'),
            subject: 'Francês',
            topic: 'Verbos no Passé Composé',
            completed: true,
          },
        ],
      },
    ];

    const usecase = new GetStudentMetricsUseCase(repo);
    const metrics = await usecase.execute({
      studentId: 'james-1',
      asOfDate: now,
      subjects: ['Francês'],
    });

    expect(metrics.subjectProgress).toHaveLength(1);
    expect(metrics.subjectProgress[0].subjectName).toBe('Francês');
    expect(metrics.pendingSummary.items.every((i) => i.subject === 'Francês')).toBe(true);
  });
});
