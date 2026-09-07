import { MaterialFormat } from '../../../../domain/value-objects/MaterialFormat.js';

export interface MaterialMongoDocument {
  _id: string;
  studentId: string;
  title: string;
  subject?: string;
  format: MaterialFormat;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'PENDING' | 'TRANSCRIBING' | 'EXTRACTING' | 'AI_GENERATING' | 'READY' | 'FAILED';
  rawContent?: string;
  summary?: string;
  keyConcepts: string[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}
