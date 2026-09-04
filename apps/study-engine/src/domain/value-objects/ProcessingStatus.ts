export type ProcessingStatus = 
  | 'PENDING'
  | 'TRANSCRIBING'
  | 'EXTRACTING'
  | 'AI_GENERATING'
  | 'READY'
  | 'FAILED';

export const PROCESSING_STATUS_ORDER: Record<ProcessingStatus, number> = {
  PENDING: 0,
  TRANSCRIBING: 1,
  EXTRACTING: 2,
  AI_GENERATING: 3,
  READY: 4,
  FAILED: -1,
} as const;
