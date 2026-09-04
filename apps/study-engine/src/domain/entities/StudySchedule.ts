export interface StudyScheduleItem {
  id: string;
  date: Date;
  dailyTargetMinutes: number;
  subject?: string;
  topic?: string;
  materialIds: string[];
  flashcardIds: string[];
  quizIds: string[];
  completed: boolean;
  completedAt?: Date;
}

export interface StudyScheduleProps {
  id: string;
  studentId: string;
  title: string;
  targetExamDate?: Date;
  items: StudyScheduleItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateStudyScheduleProps = {
  id?: string;
  studentId: string;
  title: string;
  targetExamDate?: Date;
  items?: StudyScheduleItem[];
};

export class StudySchedule {
  private props: StudyScheduleProps;

  private constructor(props: StudyScheduleProps) {
    this.props = props;
  }

  public static create(props: CreateStudyScheduleProps): StudySchedule {
    if (!props.studentId || props.studentId.trim() === '') {
      throw new Error('StudySchedule must belong to a studentId');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('StudySchedule title cannot be empty');
    }
    if (props.targetExamDate && props.targetExamDate.getTime() <= Date.now()) {
      throw new Error('Target exam date must be in the future');
    }

    const now = new Date();
    return new StudySchedule({
      id: props.id || crypto.randomUUID(),
      studentId: props.studentId,
      title: props.title.trim(),
      targetExamDate: props.targetExamDate,
      items: props.items ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(props: StudyScheduleProps): StudySchedule {
    return new StudySchedule(props);
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get studentId(): string { return this.props.studentId; }
  public get title(): string { return this.props.title; }
  public get targetExamDate(): Date | undefined { return this.props.targetExamDate; }
  public get items(): readonly StudyScheduleItem[] { return this.props.items; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  // Domain behavior
  public addItem(item: Omit<StudyScheduleItem, 'id' | 'completed' | 'completedAt'> & { id?: string }): void {
    const newItem: StudyScheduleItem = {
      id: item.id || crypto.randomUUID(),
      date: item.date,
      dailyTargetMinutes: item.dailyTargetMinutes,
      subject: item.subject,
      topic: item.topic,
      materialIds: [...item.materialIds],
      flashcardIds: [...item.flashcardIds],
      quizIds: [...item.quizIds],
      completed: false,
    };
    this.props.items.push(newItem);
    this.props.updatedAt = new Date();
  }

  public markItemCompleted(itemId: string): void {
    const item = this.props.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Schedule item with id ${itemId} not found`);
    }
    item.completed = true;
    item.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public getDaysUntilExam(currentDate: Date = new Date()): number | null {
    if (!this.props.targetExamDate) return null;
    const diffMs = this.props.targetExamDate.getTime() - currentDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  public isExamApproaching(thresholdDays = 7, currentDate: Date = new Date()): boolean {
    const days = this.getDaysUntilExam(currentDate);
    if (days === null) return false;
    return days >= 0 && days <= thresholdDays;
  }

  public calculateProgress(): number {
    if (this.props.items.length === 0) return 0;
    const completedCount = this.props.items.filter(i => i.completed).length;
    return Math.round((completedCount / this.props.items.length) * 100);
  }

  public toJSON(): StudyScheduleProps {
    return {
      ...this.props,
      items: this.props.items.map(i => ({
        ...i,
        materialIds: [...i.materialIds],
        flashcardIds: [...i.flashcardIds],
        quizIds: [...i.quizIds],
      })),
    };
  }
}
