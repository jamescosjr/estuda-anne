export type TabId = 'dashboard' | 'materials' | 'quiz' | 'flashcards' | 'schedule' | 'profile' | 'admin' | 'tira-duvidas'

export type UploadStatus = 'processing' | 'done' | 'failed'

export interface CourseProgress {
  id: string
  name: string
  color: string
  progress: number
  topics: number
  reviewed: number
}

export interface PendingReview {
  id: string
  subject: string
  type: 'quiz' | 'flashcards'
  count: number
  estimatedMinutes: number
}

export interface ScheduleEvent {
  id: string
  day: string
  date: string
  title: string
  subject: string
  type: 'quiz' | 'flashcards' | 'leitura' | 'resumo'
  time: string
  done: boolean
}

export interface UploadItem {
  id: string
  name: string
  subject?: string
  kind: 'PDF' | 'PPTX' | 'MP4' | 'MP3'
  size: string
  status: UploadStatus
  detail: string
}

export interface QuizQuestion {
  id: string
  subject: string
  prompt: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
  isNew?: boolean
}

export interface FlashcardItem {
  id: string
  subject: string
  front: string
  back: string
  persisted?: boolean
  isNew?: boolean
}

