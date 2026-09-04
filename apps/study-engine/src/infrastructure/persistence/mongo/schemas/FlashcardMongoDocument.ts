export interface FlashcardMongoDocument {
  _id: string;
  studentId: string;
  materialId: string;
  front: string;
  back: string;
  repetitionIntervalDays: number;
  easeFactor: number;
  repetitionsCount: number;
  nextReviewDate: Date;
  lastReviewedAt?: Date;
  tags: string[];
  history: Array<{
    grade: number;
    reviewedAt: Date;
    intervalDays: number;
    easeFactor: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
