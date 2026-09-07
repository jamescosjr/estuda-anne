import { Collection, Db } from 'mongodb';
import { StudentAdaptiveProfile } from '../../../../domain/entities/StudentAdaptiveProfile.js';
import { IStudentAdaptiveProfileRepository } from '../../../../domain/usecases/EvaluateQuizUseCase.js';

export interface StudentAdaptiveProfileMongoDoc {
  _id: string; // studentId
  studentId: string;
  totalFeedbacksCount: number;
  positiveCount: number;
  negativeCount: number;
  avoidTags: string[];
  preferredStyleHints: string[];
  adaptivePromptInstruction: string;
  topicWeights?: Record<string, { correct: number; wrong: number; priorityWeight: number }>;
  updatedAt: Date;
}

export class MongoStudentAdaptiveProfileRepository implements IStudentAdaptiveProfileRepository {
  private collection?: Collection<StudentAdaptiveProfileMongoDoc>;
  private memoryProfiles = new Map<string, StudentAdaptiveProfile>();

  constructor(db?: Db) {
    if (db) {
      this.collection = db.collection<StudentAdaptiveProfileMongoDoc>('student_adaptive_profiles');
    }
  }

  public async findByStudentId(studentId: string): Promise<StudentAdaptiveProfile | null> {
    if (this.collection) {
      try {
        const doc = await this.collection.findOne({ _id: studentId });
        if (doc) {
          return new StudentAdaptiveProfile({
            studentId: doc.studentId,
            totalFeedbacksCount: doc.totalFeedbacksCount,
            positiveCount: doc.positiveCount,
            negativeCount: doc.negativeCount,
            avoidTags: doc.avoidTags || [],
            preferredStyleHints: doc.preferredStyleHints || [],
            adaptivePromptInstruction: doc.adaptivePromptInstruction || '',
            topicWeights: doc.topicWeights || {},
            updatedAt: new Date(doc.updatedAt),
          });
        }
      } catch {
        // Fallback em memória
      }
    }

    return this.memoryProfiles.get(studentId) || null;
  }

  public async save(profile: StudentAdaptiveProfile): Promise<void> {
    this.memoryProfiles.set(profile.studentId, profile);

    if (this.collection) {
      try {
        await this.collection.updateOne(
          { _id: profile.studentId },
          {
            $set: {
              studentId: profile.studentId,
              totalFeedbacksCount: profile.totalFeedbacksCount,
              positiveCount: profile.positiveCount,
              negativeCount: profile.negativeCount,
              avoidTags: profile.avoidTags,
              preferredStyleHints: profile.preferredStyleHints,
              adaptivePromptInstruction: profile.adaptivePromptInstruction,
              topicWeights: profile.topicWeights,
              updatedAt: profile.updatedAt,
            },
          },
          { upsert: true }
        );
      } catch {
        // Fallback para lista em memória
      }
    }
  }
}
