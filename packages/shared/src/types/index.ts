export type MaterialFormat = 'PDF' | 'PPT' | 'VIDEO' | 'AUDIO' | 'IMAGE';

export type ProcessingStatus =
  | 'PENDING'
  | 'TRANSCRIBING'
  | 'EXTRACTING'
  | 'AI_GENERATING'
  | 'READY'
  | 'FAILED';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  repetitionIntervalDays: number;
  easeFactor: number;
  repetitionsCount: number;
  nextReviewDate: Date;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  materialId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface StudyScheduleItem {
  id: string;
  date: Date;
  dailyTargetMinutes?: number;
  subject?: string;
  topic?: string;
  materialIds?: string[];
  flashcardIds: string[];
  quizIds: string[];
  completed: boolean;
  completedAt?: Date;
}
