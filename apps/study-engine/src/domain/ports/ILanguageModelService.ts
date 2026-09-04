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

export interface ILanguageModelService {
  extractConceptsAndSummary(content: string): Promise<MaterialAnalysisResult>;
  generateFlashcards(content: string, count?: number): Promise<GeneratedFlashcardDTO[]>;
  generateQuizQuestions(content: string, questionsCount?: number): Promise<GeneratedQuizQuestionDTO[]>;
}
