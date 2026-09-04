import { MaterialFormat, ProcessingStatus } from '../value-objects/index.js';

export interface MaterialProps {
  id: string;
  studentId: string;
  title: string;
  format: MaterialFormat;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  status: ProcessingStatus;
  rawContent?: string;
  summary?: string;
  keyConcepts: string[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export type CreateMaterialProps = Omit<
  MaterialProps,
  'id' | 'status' | 'keyConcepts' | 'createdAt' | 'updatedAt' | 'summary' | 'rawContent' | 'errorMessage' | 'processedAt'
> & {
  id?: string;
};

export class Material {
  private props: MaterialProps;

  private constructor(props: MaterialProps) {
    this.props = props;
  }

  public static create(props: CreateMaterialProps): Material {
    if (!props.studentId || props.studentId.trim() === '') {
      throw new Error('Material must be associated with a valid studentId');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('Material title cannot be empty');
    }
    if (props.fileSizeBytes <= 0) {
      throw new Error('Material file size must be greater than zero bytes');
    }

    const now = new Date();
    return new Material({
      ...props,
      id: props.id || crypto.randomUUID(),
      status: 'PENDING',
      keyConcepts: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(props: MaterialProps): Material {
    return new Material(props);
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get studentId(): string { return this.props.studentId; }
  public get title(): string { return this.props.title; }
  public get format(): MaterialFormat { return this.props.format; }
  public get fileUrl(): string { return this.props.fileUrl; }
  public get fileSizeBytes(): number { return this.props.fileSizeBytes; }
  public get mimeType(): string { return this.props.mimeType; }
  public get status(): ProcessingStatus { return this.props.status; }
  public get rawContent(): string | undefined { return this.props.rawContent; }
  public get summary(): string | undefined { return this.props.summary; }
  public get keyConcepts(): readonly string[] { return this.props.keyConcepts; }
  public get errorMessage(): string | undefined { return this.props.errorMessage; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }
  public get processedAt(): Date | undefined { return this.props.processedAt; }

  // Domain behavior / state transitions
  public isAudioOrVideo(): boolean {
    return this.props.format === 'AUDIO' || this.props.format === 'VIDEO';
  }

  public startTranscription(): void {
    if (!this.isAudioOrVideo()) {
      throw new Error(`Cannot start transcription for format ${this.props.format}`);
    }
    this.props.status = 'TRANSCRIBING';
    this.props.updatedAt = new Date();
  }

  public startExtraction(): void {
    this.props.status = 'EXTRACTING';
    this.props.updatedAt = new Date();
  }

  public setRawContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Raw content cannot be empty');
    }
    this.props.rawContent = content;
    this.props.status = 'AI_GENERATING';
    this.props.updatedAt = new Date();
  }

  public completeProcessing(summary: string, keyConcepts: string[]): void {
    if (!summary || summary.trim().length === 0) {
      throw new Error('Summary cannot be empty upon completing processing');
    }
    this.props.summary = summary;
    this.props.keyConcepts = [...keyConcepts];
    this.props.status = 'READY';
    this.props.errorMessage = undefined;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markAsFailed(reason: string): void {
    this.props.status = 'FAILED';
    this.props.errorMessage = reason;
    this.props.updatedAt = new Date();
  }

  public isReady(): boolean {
    return this.props.status === 'READY';
  }

  public toJSON(): MaterialProps {
    return { ...this.props, keyConcepts: [...this.props.keyConcepts] };
  }
}
