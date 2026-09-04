import { Material } from '../entities/Material.js';
import { Flashcard } from '../entities/Flashcard.js';
import { Quiz } from '../entities/Quiz.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
  ITranscriptionService,
} from '../ports/index.js';

export interface ProcessMaterialInput {
  materialId: string;
}

export interface ProcessMaterialOutput {
  materialId: string;
  status: string;
  summary?: string;
  keyConcepts: readonly string[];
  generatedFlashcardsCount: number;
  generatedQuizId?: string;
}

export class ProcessMaterialUseCase {
  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly aiService: ILanguageModelService,
    private readonly transcriptionService: ITranscriptionService
  ) {}

  public async execute(input: ProcessMaterialInput): Promise<ProcessMaterialOutput> {
    const material = await this.materialRepository.findById(input.materialId);
    if (!material) {
      throw new Error(`Material with ID ${input.materialId} not found`);
    }

    try {
      let rawText = material.rawContent;

      // Se for áudio ou vídeo e ainda não tiver texto transcrito
      if (material.isAudioOrVideo() && !rawText) {
        material.startTranscription();
        await this.materialRepository.update(material);

        const transcription = await this.transcriptionService.transcribe(
          material.fileUrl,
          material.mimeType
        );
        rawText = transcription.text;
      }

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('No content available for AI processing');
      }

      material.setRawContent(rawText);
      await this.materialRepository.update(material);

      // Processamento inteligente com IA (Gemini Flash)
      // 1. Extração de conceitos-chave e resumo estruturado
      const analysis = await this.aiService.extractConceptsAndSummary(rawText);
      material.completeProcessing(analysis.summary, analysis.keyConcepts);
      await this.materialRepository.update(material);

      // 2. Geração automática de Flashcards
      const generatedCards = await this.aiService.generateFlashcards(rawText, 5);
      const flashcards = generatedCards.map(c =>
        Flashcard.create({
          studentId: material.studentId,
          materialId: material.id,
          front: c.front,
          back: c.back,
          tags: [...analysis.keyConcepts.slice(0, 3)],
        })
      );
      if (flashcards.length > 0) {
        await this.flashcardRepository.saveMany(flashcards);
      }

      // 3. Geração automática de Quiz
      const quizQuestions = await this.aiService.generateQuizQuestions(rawText, 4);
      let quizId: string | undefined;

      if (quizQuestions.length > 0) {
        const quiz = Quiz.create({
          studentId: material.studentId,
          materialId: material.id,
          title: `Quiz: ${material.title}`,
          questions: quizQuestions,
        });
        await this.quizRepository.save(quiz);
        quizId = quiz.id;
      }

      return {
        materialId: material.id,
        status: material.status,
        summary: material.summary,
        keyConcepts: material.keyConcepts,
        generatedFlashcardsCount: flashcards.length,
        generatedQuizId: quizId,
      };
    } catch (error: any) {
      material.markAsFailed(error.message || 'Unknown processing error');
      await this.materialRepository.update(material);
      throw error;
    }
  }
}
