export interface QuizQuestionMongoDocument {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizMongoDocument {
  _id: string;
  studentId: string;
  materialId: string;
  title: string;
  questions: QuizQuestionMongoDocument[];
  createdAt: Date;
  updatedAt: Date;
}
