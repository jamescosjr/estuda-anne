export interface TopicWeightDetail {
  correct: number;
  wrong: number;
  priorityWeight: number;
}

export interface StudentAdaptiveProfileProps {
  studentId: string;
  totalFeedbacksCount: number;
  positiveCount: number;
  negativeCount: number;
  avoidTags: string[];
  preferredStyleHints: string[];
  adaptivePromptInstruction: string;
  topicWeights?: Record<string, TopicWeightDetail>;
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
  readonly topicWeights: Record<string, TopicWeightDetail>;
  readonly updatedAt: Date;

  constructor(props: StudentAdaptiveProfileProps) {
    this.studentId = props.studentId;
    this.totalFeedbacksCount = props.totalFeedbacksCount;
    this.positiveCount = props.positiveCount;
    this.negativeCount = props.negativeCount;
    this.avoidTags = props.avoidTags || [];
    this.preferredStyleHints = props.preferredStyleHints || [];
    this.adaptivePromptInstruction = props.adaptivePromptInstruction || '';
    this.topicWeights = props.topicWeights || {};
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
      topicWeights: {},
      updatedAt: new Date(),
    });
  }

  public recordQuizResult(results: Array<{ topic: string; isCorrect: boolean }>): StudentAdaptiveProfile {
    const updatedWeights = { ...this.topicWeights };

    for (const item of results) {
      const current = updatedWeights[item.topic] || { correct: 0, wrong: 0, priorityWeight: 1.0 };
      const newCorrect = item.isCorrect ? current.correct + 1 : current.correct;
      const newWrong = !item.isCorrect ? current.wrong + 1 : current.wrong;

      // Cálculo de peso priorizando tópicos com maiores taxas de erro (reforço ativo)
      const totalAttempts = newCorrect + newWrong;
      const errorRate = totalAttempts > 0 ? newWrong / totalAttempts : 0;
      // Peso varia de 1.0 (equilibrado) a 3.0 (alta prioridade para conceitos fracos)
      const priorityWeight = Math.min(3.0, Math.max(1.0, 1.0 + errorRate * 2.0));

      updatedWeights[item.topic] = {
        correct: newCorrect,
        wrong: newWrong,
        priorityWeight: Number(priorityWeight.toFixed(2)),
      };
    }

    // Identifica tópicos fracos para instrução adaptativa no prompt
    const weakTopics = Object.entries(updatedWeights)
      .filter(([_, detail]) => detail.priorityWeight > 1.5)
      .map(([topic]) => topic);

    const adaptiveInstruction = weakTopics.length > 0
      ? `Atenção pedagógica: a estudante apresenta fragilidades nos tópicos: ${weakTopics.join(', ')}. Dedique 60% das novas questões e flashcards a esses tópicos.`
      : 'Desempenho equilibrado. Mantenha distribuição uniforme entre os conceitos.';

    return new StudentAdaptiveProfile({
      studentId: this.studentId,
      totalFeedbacksCount: this.totalFeedbacksCount + 1,
      positiveCount: this.positiveCount,
      negativeCount: this.negativeCount,
      avoidTags: this.avoidTags,
      preferredStyleHints: this.preferredStyleHints,
      adaptivePromptInstruction: adaptiveInstruction,
      topicWeights: updatedWeights,
      updatedAt: new Date(),
    });
  }
}
