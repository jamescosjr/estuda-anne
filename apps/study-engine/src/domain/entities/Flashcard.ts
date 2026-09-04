import { ReviewGrade } from '../value-objects/index.js';

export interface ReviewLog {
  grade: ReviewGrade;
  reviewedAt: Date;
  intervalDays: number;
  easeFactor: number;
}

export interface FlashcardProps {
  id: string;
  studentId: string;
  materialId: string;
  front: string;
  back: string;
  repetitionIntervalDays: number;
  easeFactor: number;
  repetitionsCount: number;
  nextReviewDate: Date;
  lastReviewedAt?: Date;
  tags: string[];
  history: ReviewLog[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFlashcardProps = {
  id?: string;
  studentId: string;
  materialId: string;
  front: string;
  back: string;
  tags?: string[];
};

export class Flashcard {
  public static readonly MINIMUM_EASE_FACTOR = 1.3;
  public static readonly DEFAULT_EASE_FACTOR = 2.5;

  private props: FlashcardProps;

  private constructor(props: FlashcardProps) {
    this.props = props;
  }

  public static create(props: CreateFlashcardProps): Flashcard {
    if (!props.studentId || props.studentId.trim() === '') {
      throw new Error('Flashcard must have a valid studentId');
    }
    if (!props.materialId || props.materialId.trim() === '') {
      throw new Error('Flashcard must belong to a materialId');
    }
    if (!props.front || props.front.trim() === '') {
      throw new Error('Flashcard front prompt cannot be empty');
    }
    if (!props.back || props.back.trim() === '') {
      throw new Error('Flashcard back answer cannot be empty');
    }

    const now = new Date();
    // Default initial review is set to tomorrow (1 day interval)
    const initialNextReview = new Date(now);
    initialNextReview.setDate(initialNextReview.getDate() + 1);

    return new Flashcard({
      id: props.id || crypto.randomUUID(),
      studentId: props.studentId,
      materialId: props.materialId,
      front: props.front.trim(),
      back: props.back.trim(),
      repetitionIntervalDays: 1,
      easeFactor: Flashcard.DEFAULT_EASE_FACTOR,
      repetitionsCount: 0,
      nextReviewDate: initialNextReview,
      tags: props.tags ?? [],
      history: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(props: FlashcardProps): Flashcard {
    return new Flashcard(props);
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get studentId(): string { return this.props.studentId; }
  public get materialId(): string { return this.props.materialId; }
  public get front(): string { return this.props.front; }
  public get back(): string { return this.props.back; }
  public get repetitionIntervalDays(): number { return this.props.repetitionIntervalDays; }
  public get easeFactor(): number { return this.props.easeFactor; }
  public get repetitionsCount(): number { return this.props.repetitionsCount; }
  public get nextReviewDate(): Date { return this.props.nextReviewDate; }
  public get lastReviewedAt(): Date | undefined { return this.props.lastReviewedAt; }
  public get tags(): readonly string[] { return this.props.tags; }
  public get history(): readonly ReviewLog[] { return this.props.history; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Implementação do algoritmo SuperMemo SM-2 para retenção de memória a longo prazo.
   * Modifica o intervalo de repetição, número de repetições e o Ease Factor (EF)
   * baseado na nota de 0 a 5.
   */
  public applyReview(grade: ReviewGrade, reviewedAt: Date = new Date()): void {
    let nextInterval: number;
    let nextRepetitions = this.props.repetitionsCount;

    if (grade >= 3) {
      // Sucesso na recordação
      if (nextRepetitions === 0) {
        nextInterval = 1;
      } else if (nextRepetitions === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(this.props.repetitionIntervalDays * this.props.easeFactor);
      }
      nextRepetitions += 1;
    } else {
      // Falha / Lapso de memória: reseta contagem e recomeça do dia 1
      nextRepetitions = 0;
      nextInterval = 1;
    }

    // Fórmula clássica do SM-2 para atualização do Ease Factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const q = grade;
    const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    const updatedEaseFactor = Math.max(
      Flashcard.MINIMUM_EASE_FACTOR,
      Number((this.props.easeFactor + efDelta).toFixed(3))
    );

    // Próxima data de revisão
    const nextDate = new Date(reviewedAt);
    nextDate.setDate(nextDate.getDate() + nextInterval);

    this.props.history.push({
      grade,
      reviewedAt,
      intervalDays: nextInterval,
      easeFactor: updatedEaseFactor,
    });

    this.props.repetitionIntervalDays = nextInterval;
    this.props.easeFactor = updatedEaseFactor;
    this.props.repetitionsCount = nextRepetitions;
    this.props.nextReviewDate = nextDate;
    this.props.lastReviewedAt = reviewedAt;
    this.props.updatedAt = new Date();
  }

  public isDue(currentDate: Date = new Date()): boolean {
    return this.props.nextReviewDate.getTime() <= currentDate.getTime();
  }

  public toJSON(): FlashcardProps {
    return {
      ...this.props,
      tags: [...this.props.tags],
      history: this.props.history.map(h => ({ ...h })),
    };
  }
}
