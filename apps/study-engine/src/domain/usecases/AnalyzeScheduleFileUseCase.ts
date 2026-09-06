import { ILanguageModelService, ParsedScheduleAnalysisResult } from '../ports/ILanguageModelService.js';

export interface AnalyzeScheduleFileInput {
  studentId: string;
  fileBase64?: string;
  mimeType?: string;
  textContent?: string;
}

export class AnalyzeScheduleFileUseCase {
  constructor(private readonly aiService: ILanguageModelService) {}

  public async execute(input: AnalyzeScheduleFileInput): Promise<ParsedScheduleAnalysisResult> {
    if (!input.studentId) {
      throw new Error('studentId is required to analyze a schedule file');
    }
    if (!input.fileBase64 && !input.textContent) {
      throw new Error('fileBase64 or textContent is required');
    }

    return this.aiService.analyzeScheduleImageOrDocument({
      mimeType: input.mimeType,
      dataBase64: input.fileBase64,
      textContent: input.textContent,
    });
  }
}
