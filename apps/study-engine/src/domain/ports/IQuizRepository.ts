import { Quiz } from '../entities/Quiz.js';

export interface IQuizRepository {
  save(quiz: Quiz): Promise<void>;
  findById(id: string): Promise<Quiz | null>;
  findByMaterialId(materialId: string): Promise<Quiz[]>;
  findByStudentId(studentId: string): Promise<Quiz[]>;
  delete(id: string): Promise<void>;
}
