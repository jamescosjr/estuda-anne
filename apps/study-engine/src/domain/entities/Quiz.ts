export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizEvaluationFeedbackItem {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizEvaluationResult {
  quizId: string;
  studentId: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  feedback: QuizEvaluationFeedbackItem[];
  evaluatedAt: Date;
}

export interface QuizProps {
  id: string;
  studentId: string;
  materialId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateQuizProps = {
  id?: string;
  studentId: string;
  materialId: string;
  title: string;
  questions: Array<Omit<QuizQuestion, 'id'> & { id?: string }>;
};

export class Quiz {
  private props: QuizProps;

  private constructor(props: QuizProps) {
    this.props = props;
  }

  public static create(props: CreateQuizProps): Quiz {
    if (!props.studentId || props.studentId.trim() === '') {
      throw new Error('Quiz must belong to a studentId');
    }
    if (!props.materialId || props.materialId.trim() === '') {
      throw new Error('Quiz must belong to a materialId');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('Quiz title cannot be empty');
    }
    if (!props.questions || props.questions.length === 0) {
      throw new Error('Quiz must contain at least one question');
    }

    const validatedQuestions: QuizQuestion[] = props.questions.map((q, idx) => {
      if (!q.prompt || q.prompt.trim() === '') {
        throw new Error(`Question ${idx + 1} prompt cannot be empty`);
      }
      if (!q.options || q.options.length < 2) {
        throw new Error(`Question ${idx + 1} must have at least 2 options`);
      }
      if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
        throw new Error(`Question ${idx + 1} correctAnswerIndex is out of range`);
      }
      return {
        id: q.id || crypto.randomUUID(),
        prompt: q.prompt.trim(),
        options: [...q.options],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation?.trim() || '',
      };
    });

    const now = new Date();
    return new Quiz({
      id: props.id || crypto.randomUUID(),
      studentId: props.studentId,
      materialId: props.materialId,
      title: props.title.trim(),
      questions: validatedQuestions,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(props: QuizProps): Quiz {
    return new Quiz(props);
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get studentId(): string { return this.props.studentId; }
  public get materialId(): string { return this.props.materialId; }
  public get title(): string { return this.props.title; }
  public get questions(): readonly QuizQuestion[] { return this.props.questions; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Avalia a submissão de respostas do estudante, calculando pontuação e feedback detalhado.
   */
  public evaluate(studentAnswers: Array<{ questionId: string; selectedOptionIndex: number }>): QuizEvaluationResult {
    const answersMap = new Map<string, number>();
    for (const ans of studentAnswers) {
      answersMap.set(ans.questionId, ans.selectedOptionIndex);
    }

    let correctCount = 0;
    const feedback: QuizEvaluationFeedbackItem[] = [];

    for (const question of this.props.questions) {
      const selectedIndex = answersMap.get(question.id) ?? -1;
      const isCorrect = selectedIndex === question.correctAnswerIndex;
      if (isCorrect) {
        correctCount += 1;
      }
      feedback.push({
        questionId: question.id,
        selectedIndex,
        isCorrect,
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation,
      });
    }

    const totalQuestions = this.props.questions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      quizId: this.props.id,
      studentId: this.props.studentId,
      totalQuestions,
      correctCount,
      scorePercentage,
      feedback,
      evaluatedAt: new Date(),
    };
  }

  public toJSON(): QuizProps {
    return {
      ...this.props,
      questions: this.props.questions.map(q => ({ ...q, options: [...q.options] })),
    };
  }
}
