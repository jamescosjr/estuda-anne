export type TaskType = 'schedule_overdue' | 'flashcard_due' | 'quiz_pending' | 'reading';
export type ScheduleStatus = 'EM_DIA' | 'ATRASADO' | 'SEM_CRONOGRAMA';

export interface PendingTaskItem {
  id: string;
  type: TaskType;
  subject: string;
  title: string;
  dueDate?: Date;
  estimatedMinutes: number;
  isOverdue: boolean;
  meta?: Record<string, any>;
}

export interface ScheduleAdherence {
  totalScheduledItems: number;
  completedItems: number;
  overdueItems: number;
  onTimeItems: number;
  adherencePercentage: number;
  status: ScheduleStatus;
}

export interface EvolutionaryVelocityItem {
  day: string;
  date: string;
  targetMinutes: number;
  completedMinutes: number;
  completedTasksCount: number;
}

export interface EvolutionaryMetrics {
  weeklyVelocity: EvolutionaryVelocityItem[];
  studyStreakDays: number;
  overallCompletionPct: number;
  totalTimeSpentMinutes: number;
  retentionRatePct: number;
}

export interface SubjectProgressMetrics {
  subjectName: string;
  progressPct: number;
  topicsTotal: number;
  topicsCompleted: number;
  overdueCount: number;
}

export interface StudentMetricsOverview {
  studentId: string;
  pendingSummary: {
    totalPendingCount: number;
    overdueScheduleCount: number;
    dueFlashcardsCount: number;
    items: PendingTaskItem[];
  };
  scheduleAdherence: ScheduleAdherence;
  evolutionary: EvolutionaryMetrics;
  subjectProgress: SubjectProgressMetrics[];
  updatedAt: Date;
}
