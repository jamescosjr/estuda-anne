import { AIFeedback, AIFeedbackRating, AIFeedbackReasonTag, AIFeedbackTargetType } from '../entities/AIFeedback.js';
import { StudentAdaptiveProfile } from '../entities/StudentAdaptiveProfile.js';
import { IAIFeedbackRepository } from '../ports/IAIFeedbackRepository.js';

export interface SubmitAIFeedbackInput {
  studentId: string;
  targetType: AIFeedbackTargetType;
  targetId: string;
  subject?: string;
  rating: AIFeedbackRating;
  reasonTag?: AIFeedbackReasonTag;
  comment?: string;
}

export interface SubmitAIFeedbackOutput {
  feedback: AIFeedback;
  adaptiveProfile: StudentAdaptiveProfile;
}

export class SubmitAIFeedbackUseCase {
  constructor(private feedbackRepository: IAIFeedbackRepository) {}

  public async execute(input: SubmitAIFeedbackInput): Promise<SubmitAIFeedbackOutput> {
    if (!input.studentId || !input.targetType || !input.targetId || !input.rating) {
      throw new Error('Parâmetros obrigatórios ausentes: studentId, targetType, targetId, rating');
    }

    const feedback = new AIFeedback({
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: input.studentId,
      targetType: input.targetType,
      targetId: input.targetId,
      subject: input.subject,
      rating: input.rating,
      reasonTag: input.reasonTag,
      comment: input.comment,
      createdAt: new Date(),
    });

    await this.feedbackRepository.save(feedback);
    const adaptiveProfile = await this.feedbackRepository.getAdaptiveProfile(input.studentId);

    return {
      feedback,
      adaptiveProfile,
    };
  }
}
