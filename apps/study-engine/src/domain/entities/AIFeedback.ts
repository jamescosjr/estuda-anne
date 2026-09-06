export type AIFeedbackTargetType = 'quiz' | 'flashcard' | 'material' | 'schedule';
export type AIFeedbackRating = 'POSITIVE' | 'NEGATIVE';
export type AIFeedbackReasonTag = 'OUT_OF_CONTEXT' | 'TOO_EASY' | 'TOO_HARD' | 'GREAT_EXPLANATION' | 'OTHER';

export interface AIFeedbackProps {
  id: string;
  studentId: string;
  targetType: AIFeedbackTargetType;
  targetId: string;
  subject?: string;
  rating: AIFeedbackRating;
  reasonTag?: AIFeedbackReasonTag;
  comment?: string;
  createdAt: Date;
}

export class AIFeedback {
  readonly id: string;
  readonly studentId: string;
  readonly targetType: AIFeedbackTargetType;
  readonly targetId: string;
  readonly subject?: string;
  readonly rating: AIFeedbackRating;
  readonly reasonTag?: AIFeedbackReasonTag;
  readonly comment?: string;
  readonly createdAt: Date;

  constructor(props: AIFeedbackProps) {
    this.id = props.id;
    this.studentId = props.studentId;
    this.targetType = props.targetType;
    this.targetId = props.targetId;
    this.subject = props.subject;
    this.rating = props.rating;
    this.reasonTag = props.reasonTag;
    this.comment = props.comment;
    this.createdAt = props.createdAt || new Date();
  }
}
