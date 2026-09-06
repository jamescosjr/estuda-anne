import { AIFeedback } from '../entities/AIFeedback.js';
import { StudentAdaptiveProfile } from '../entities/StudentAdaptiveProfile.js';

export interface IAIFeedbackRepository {
  save(feedback: AIFeedback): Promise<void>;
  findByStudentId(studentId: string, limit?: number): Promise<AIFeedback[]>;
  getAdaptiveProfile(studentId: string): Promise<StudentAdaptiveProfile>;
}
