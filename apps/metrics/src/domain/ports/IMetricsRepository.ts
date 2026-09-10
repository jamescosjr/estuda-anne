export interface ScheduleItemRaw {
  id: string;
  date: Date;
  dailyTargetMinutes?: number;
  subject?: string;
  topic?: string;
  materialIds?: string[];
  flashcardIds?: string[];
  quizIds?: string[];
  completed: boolean;
  completedAt?: Date;
}

export interface ScheduleRaw {
  id: string;
  studentId: string;
  title: string;
  items: ScheduleItemRaw[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlashcardRaw {
  id: string;
  studentId: string;
  materialId?: string;
  front: string;
  back: string;
  nextReviewDate: Date;
  lastReviewedAt?: Date;
  repetitionIntervalDays?: number;
  easeFactor?: number;
  repetitionsCount?: number;
  history?: Array<{
    grade: number;
    reviewedAt: Date;
  }>;
}

export interface MaterialRaw {
  id: string;
  studentId: string;
  title: string;
  subject?: string;
}

export interface IMetricsRepository {
  getSchedulesByStudentId(studentId: string): Promise<ScheduleRaw[]>;
  getFlashcardsByStudentId(studentId: string): Promise<FlashcardRaw[]>;
  getMaterialsByStudentId(studentId: string): Promise<MaterialRaw[]>;
}
