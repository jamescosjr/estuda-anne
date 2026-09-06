export interface StudentAdaptiveProfileProps {
  studentId: string;
  totalFeedbacksCount: number;
  positiveCount: number;
  negativeCount: number;
  avoidTags: string[];
  preferredStyleHints: string[];
  adaptivePromptInstruction: string;
  updatedAt: Date;
}

export class StudentAdaptiveProfile {
  readonly studentId: string;
  readonly totalFeedbacksCount: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
  readonly avoidTags: string[];
  readonly preferredStyleHints: string[];
  readonly adaptivePromptInstruction: string;
  readonly updatedAt: Date;

  constructor(props: StudentAdaptiveProfileProps) {
    this.studentId = props.studentId;
    this.totalFeedbacksCount = props.totalFeedbacksCount;
    this.positiveCount = props.positiveCount;
    this.negativeCount = props.negativeCount;
    this.avoidTags = props.avoidTags || [];
    this.preferredStyleHints = props.preferredStyleHints || [];
    this.adaptivePromptInstruction = props.adaptivePromptInstruction || '';
    this.updatedAt = props.updatedAt || new Date();
  }

  static createDefault(studentId: string): StudentAdaptiveProfile {
    return new StudentAdaptiveProfile({
      studentId,
      totalFeedbacksCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      avoidTags: [],
      preferredStyleHints: [],
      adaptivePromptInstruction: 'Nenhuma preferência específica gravada ainda. Mantenha tom acadêmico claro e equilibrado.',
      updatedAt: new Date(),
    });
  }
}
