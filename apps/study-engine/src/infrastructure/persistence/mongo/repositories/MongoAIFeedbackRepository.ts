import { Collection, Db } from 'mongodb';
import { AIFeedback, AIFeedbackProps } from '../../../../domain/entities/AIFeedback.js';
import { StudentAdaptiveProfile } from '../../../../domain/entities/StudentAdaptiveProfile.js';
import { IAIFeedbackRepository } from '../../../../domain/ports/IAIFeedbackRepository.js';

export interface AIFeedbackMongoDoc {
  _id: string;
  studentId: string;
  targetType: string;
  targetId: string;
  subject?: string;
  rating: string;
  reasonTag?: string;
  comment?: string;
  createdAt: Date;
}

export class MongoAIFeedbackRepository implements IAIFeedbackRepository {
  private collection?: Collection<AIFeedbackMongoDoc>;
  private memoryFeedbacks: AIFeedback[] = [];

  constructor(db?: Db) {
    if (db) {
      this.collection = db.collection<AIFeedbackMongoDoc>('ai_feedbacks');
    }
  }

  public async save(feedback: AIFeedback): Promise<void> {
    this.memoryFeedbacks.push(feedback);

    if (this.collection) {
      try {
        await this.collection.insertOne({
          _id: feedback.id,
          studentId: feedback.studentId,
          targetType: feedback.targetType,
          targetId: feedback.targetId,
          subject: feedback.subject,
          rating: feedback.rating,
          reasonTag: feedback.reasonTag,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
        });
      } catch (err) {
        // Fallback em memória se mongo falhar
      }
    }
  }

  public async findByStudentId(studentId: string, limit = 50): Promise<AIFeedback[]> {
    if (this.collection) {
      try {
        const docs = await this.collection
          .find({ studentId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        if (docs && docs.length > 0) {
          return docs.map(
            (doc) =>
              new AIFeedback({
                id: doc._id,
                studentId: doc.studentId,
                targetType: doc.targetType as any,
                targetId: doc.targetId,
                subject: doc.subject,
                rating: doc.rating as any,
                reasonTag: doc.reasonTag as any,
                comment: doc.comment,
                createdAt: new Date(doc.createdAt),
              })
          );
        }
      } catch (err) {
        // Fallback para lista em memória
      }
    }

    return this.memoryFeedbacks
      .filter((f) => f.studentId === studentId)
      .slice(-limit);
  }

  public async getAdaptiveProfile(studentId: string): Promise<StudentAdaptiveProfile> {
    const list = await this.findByStudentId(studentId, 100);

    if (list.length === 0) {
      return StudentAdaptiveProfile.createDefault(studentId);
    }

    const positiveCount = list.filter((f) => f.rating === 'POSITIVE').length;
    const negativeCount = list.filter((f) => f.rating === 'NEGATIVE').length;

    const avoidTagsSet = new Set<string>();
    const preferredStyleSet = new Set<string>();

    list.forEach((f) => {
      if (f.rating === 'NEGATIVE' && f.reasonTag) {
        if (f.reasonTag === 'OUT_OF_CONTEXT') avoidTagsSet.add('evitar questões genéricas fora do plano da disciplina');
        if (f.reasonTag === 'TOO_HARD') avoidTagsSet.add('simplificar o vocabulário e adicionar mais passos intermediários');
        if (f.reasonTag === 'TOO_EASY') avoidTagsSet.add('aumentar o nível de desafio e profundidade conceitual');
      }
      if (f.rating === 'POSITIVE') {
        if (f.reasonTag === 'GREAT_EXPLANATION') preferredStyleSet.add('fornecer explicações detalhadas com analogias práticas');
        preferredStyleSet.add('manter formato objetivo com dicas diretas');
      }
    });

    const avoidTags = Array.from(avoidTagsSet);
    const preferredStyleHints = Array.from(preferredStyleSet);

    let instruction = `Perfil de Adaptação de IA (${list.length} avaliações):`;
    if (avoidTags.length > 0) {
      instruction += ` | ATENÇÃO: ${avoidTags.join('; ')}.`;
    }
    if (preferredStyleHints.length > 0) {
      instruction += ` | PREFERÊNCIAS: ${preferredStyleHints.join('; ')}.`;
    }

    return new StudentAdaptiveProfile({
      studentId,
      totalFeedbacksCount: list.length,
      positiveCount,
      negativeCount,
      avoidTags,
      preferredStyleHints,
      adaptivePromptInstruction: instruction,
      updatedAt: new Date(),
    });
  }
}
