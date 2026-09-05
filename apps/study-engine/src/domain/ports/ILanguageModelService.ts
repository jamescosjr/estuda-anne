export interface GeneratedFlashcardDTO {
  front: string;
  back: string;
}

export interface GeneratedQuizQuestionDTO {
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface MaterialAnalysisResult {
  summary: string;
  keyConcepts: string[];
}

export interface ParsedScheduleExamDTO {
  subject: string;
  title: string;
  date: string;
}

export interface ParsedScheduleAnalysisResult {
  periodStartDate?: string;
  periodEndDate?: string;
  subjects: string[];
  examDates: ParsedScheduleExamDTO[];
  suggestedScheduleEvents?: Array<{
    day: string;
    date: string;
    title: string;
    subject: string;
    type: 'quiz' | 'flashcards' | 'leitura' | 'resumo';
    time: string;
  }>;
}

export interface ILanguageModelService {
  extractConceptsAndSummary(content: string): Promise<MaterialAnalysisResult>;
  generateFlashcards(content: string, count?: number): Promise<GeneratedFlashcardDTO[]>;
  generateQuizQuestions(content: string, questionsCount?: number): Promise<GeneratedQuizQuestionDTO[]>;
  analyzeScheduleImageOrDocument(fileData: { mimeType?: string; dataBase64?: string; textContent?: string }): Promise<ParsedScheduleAnalysisResult>;
}
