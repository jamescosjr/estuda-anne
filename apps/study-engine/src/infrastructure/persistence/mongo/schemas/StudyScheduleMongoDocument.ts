export interface StudyScheduleItemMongoDocument {
  id: string;
  date: Date;
  dailyTargetMinutes: number;
  subject?: string;
  topic?: string;
  materialIds: string[];
  flashcardIds: string[];
  quizIds: string[];
  completed: boolean;
  completedAt?: Date;
}

export interface StudyScheduleMongoDocument {
  _id: string;
  studentId: string;
  title: string;
  targetExamDate?: Date;
  items: StudyScheduleItemMongoDocument[];
  createdAt: Date;
  updatedAt: Date;
}
