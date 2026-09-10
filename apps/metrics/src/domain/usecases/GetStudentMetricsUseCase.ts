import {
  StudentMetricsOverview,
  PendingTaskItem,
  ScheduleAdherence,
  EvolutionaryMetrics,
  EvolutionaryVelocityItem,
  SubjectProgressMetrics,
} from '../entities/Metrics.js';
import { IMetricsRepository } from '../ports/IMetricsRepository.js';

export interface GetStudentMetricsInput {
  studentId: string;
  asOfDate?: Date;
  subjects?: string[];
}

export class GetStudentMetricsUseCase {
  constructor(private readonly metricsRepository: IMetricsRepository) {}

  public async execute(input: GetStudentMetricsInput): Promise<StudentMetricsOverview> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('studentId é obrigatório para calcular métricas');
    }

    const now = input.asOfDate ? new Date(input.asOfDate) : new Date();
    // Início do dia atual para comparações de datas de cronograma
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [schedules, flashcards, materials] = await Promise.all([
      this.metricsRepository.getSchedulesByStudentId(input.studentId),
      this.metricsRepository.getFlashcardsByStudentId(input.studentId),
      this.metricsRepository.getMaterialsByStudentId(input.studentId),
    ]);

    // Mapeamento de materiais por id para obter matérias
    const materialSubjectMap = new Map<string, string>();
    materials.forEach((mat) => {
      if (mat.subject) {
        materialSubjectMap.set(mat.id, mat.subject);
      }
    });

    const pendingItems: PendingTaskItem[] = [];
    let overdueScheduleCount = 0;

    let totalScheduledItems = 0;
    let completedItems = 0;

    // Estruturas para progresso por disciplina
    const subjectStats = new Map<
      string,
      { topicsTotal: number; topicsCompleted: number; overdueCount: number }
    >();

    // Garantir matérias informadas no input ou dos materiais
    const knownSubjects = new Set<string>(input.subjects || []);
    materials.forEach((m) => {
      if (m.subject) knownSubjects.add(m.subject);
    });

    knownSubjects.forEach((sub) => {
      subjectStats.set(sub, { topicsTotal: 0, topicsCompleted: 0, overdueCount: 0 });
    });

    // 1. Processar itens do Cronograma
    const allScheduleItems = schedules.flatMap((s) => s.items || []);

    for (const item of allScheduleItems) {
      const itemDate = new Date(item.date);
      const itemSubject = item.subject || 'Geral';

      let stats = subjectStats.get(itemSubject);
      if (!stats) {
        stats = { topicsTotal: 0, topicsCompleted: 0, overdueCount: 0 };
        subjectStats.set(itemSubject, stats);
      }
      stats.topicsTotal += 1;

      if (item.completed) {
        completedItems += 1;
        stats.topicsCompleted += 1;
      }

      // Se a data for anterior ou igual a hoje e NÃO estiver concluído -> ATRASADO / PENDENTE
      const isOverdue = !item.completed && itemDate <= now;

      if (isOverdue) {
        overdueScheduleCount += 1;
        stats.overdueCount += 1;

        const taskType = item.quizIds?.length
          ? 'quiz_pending'
          : item.flashcardIds?.length
          ? 'flashcard_due'
          : 'reading';

        pendingItems.push({
          id: item.id,
          type: taskType,
          subject: itemSubject,
          title: item.topic || 'Sessão de estudo agendada',
          dueDate: itemDate,
          estimatedMinutes: item.dailyTargetMinutes || 30,
          isOverdue: itemDate < startOfToday,
          meta: {
            quizIds: item.quizIds,
            flashcardIds: item.flashcardIds,
            materialIds: item.materialIds,
          },
        });
      }

      if (itemDate <= now) {
        totalScheduledItems += 1;
      }
    }

    // 2. Processar Flashcards Vencidos (Spaced Repetition)
    let dueFlashcardsCount = 0;
    const dueFlashcardsMapBySubject = new Map<string, number>();

    for (const card of flashcards) {
      const nextReview = new Date(card.nextReviewDate);
      if (nextReview <= now) {
        dueFlashcardsCount += 1;

        const matSubject = card.materialId
          ? materialSubjectMap.get(card.materialId)
          : undefined;
        const cardSubject = matSubject || 'Flashcards Espaçados';
        dueFlashcardsMapBySubject.set(
          cardSubject,
          (dueFlashcardsMapBySubject.get(cardSubject) || 0) + 1
        );
      }
    }

    // Adicionar item consolidado de flashcards vencidos para o dashboard se houver
    if (dueFlashcardsCount > 0) {
      pendingItems.push({
        id: 'due-flashcards-summary',
        type: 'flashcard_due',
        subject: 'Revisão Espaçada',
        title: `${dueFlashcardsCount} flashcard(s) para revisar`,
        dueDate: now,
        estimatedMinutes: Math.max(10, Math.ceil(dueFlashcardsCount * 1.5)),
        isOverdue: false,
        meta: {
          totalCards: dueFlashcardsCount,
          bySubject: Object.fromEntries(dueFlashcardsMapBySubject),
        },
      });
    }

    // 3. Aderência ao Cronograma
    const overdueTotal = overdueScheduleCount;
    const adherencePercentage =
      totalScheduledItems > 0
        ? Math.round((completedItems / totalScheduledItems) * 100)
        : 100;

    let scheduleStatus: ScheduleAdherence['status'] = 'EM_DIA';
    if (allScheduleItems.length === 0) {
      scheduleStatus = 'SEM_CRONOGRAMA';
    } else if (overdueTotal > 0) {
      scheduleStatus = 'ATRASADO';
    }

    const scheduleAdherence: ScheduleAdherence = {
      totalScheduledItems,
      completedItems,
      overdueItems: overdueTotal,
      onTimeItems: Math.max(0, completedItems - overdueTotal),
      adherencePercentage: Math.min(100, Math.max(0, adherencePercentage)),
      status: scheduleStatus,
    };

    // 4. Velocidade Evolutiva (Últimos 7 dias)
    const weeklyVelocity: EvolutionaryVelocityItem[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);

      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayItems = allScheduleItems.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= dayStart && itemDate <= dayEnd;
      });

      const completedDayItems = dayItems.filter(
        (item) => item.completed && item.completedAt && new Date(item.completedAt) <= dayEnd
      );

      const targetMins = dayItems.reduce((acc, curr) => acc + (curr.dailyTargetMinutes || 30), 0);
      const completedMins = completedDayItems.reduce(
        (acc, curr) => acc + (curr.dailyTargetMinutes || 30),
        0
      );

      weeklyVelocity.push({
        day: dayNames[d.getDay()],
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        targetMinutes: targetMins || 60,
        completedMinutes: completedMins,
        completedTasksCount: completedDayItems.length,
      });
    }

    // 5. Cálculo do Streak de Dias Estudados
    let streakDays = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(startOfToday);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const checkEnd = new Date(
        checkDate.getFullYear(),
        checkDate.getMonth(),
        checkDate.getDate(),
        23,
        59,
        59,
        999
      );

      const hasActivity =
        allScheduleItems.some(
          (item) => item.completed && item.completedAt && new Date(item.completedAt) >= checkStart && new Date(item.completedAt) <= checkEnd
        ) ||
        flashcards.some((card) =>
          card.history?.some(
            (h) => new Date(h.reviewedAt) >= checkStart && new Date(h.reviewedAt) <= checkEnd
          )
        );

      if (hasActivity) {
        streakDays += 1;
      } else if (i > 0) {
        // Interrompe o streak se um dia no passado não teve estudo
        break;
      }
    }

    // 6. Taxa de Retenção Média (baseada nas notas dos flashcards)
    let totalGrades = 0;
    let countGrades = 0;
    flashcards.forEach((card) => {
      card.history?.forEach((h) => {
        totalGrades += h.grade;
        countGrades += 1;
      });
    });
    const retentionRatePct =
      countGrades > 0 ? Math.round((totalGrades / (countGrades * 5)) * 100) : 85;

    const totalTimeSpent = weeklyVelocity.reduce((acc, curr) => acc + curr.completedMinutes, 0);
    const overallCompletionPct =
      allScheduleItems.length > 0
        ? Math.round(
            (allScheduleItems.filter((i) => i.completed).length / allScheduleItems.length) * 100
          )
        : 0;

    const evolutionary: EvolutionaryMetrics = {
      weeklyVelocity,
      studyStreakDays: streakDays,
      overallCompletionPct,
      totalTimeSpentMinutes: totalTimeSpent,
      retentionRatePct,
    };

    // 7. Lista de Progresso por Matéria
    const subjectProgress: SubjectProgressMetrics[] = Array.from(subjectStats.entries()).map(
      ([subjectName, stats]) => {
        const progressPct =
          stats.topicsTotal > 0
            ? Math.round((stats.topicsCompleted / stats.topicsTotal) * 100)
            : 0;
        return {
          subjectName,
          progressPct,
          topicsTotal: stats.topicsTotal,
          topicsCompleted: stats.topicsCompleted,
          overdueCount: stats.overdueCount,
        };
      }
    );

    return {
      studentId: input.studentId,
      pendingSummary: {
        totalPendingCount: overdueScheduleCount + (dueFlashcardsCount > 0 ? 1 : 0),
        overdueScheduleCount,
        dueFlashcardsCount,
        items: pendingItems,
      },
      scheduleAdherence,
      evolutionary,
      subjectProgress,
      updatedAt: now,
    };
  }
}
