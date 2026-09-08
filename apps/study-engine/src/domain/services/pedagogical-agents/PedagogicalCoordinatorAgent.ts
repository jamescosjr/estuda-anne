import { Material } from '../../entities/Material.js';
import { MaterialEvaluatorAgent } from './MaterialEvaluatorAgent.js';
import { FlashcardSpecialistAgent } from './FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from './QuizSpecialistAgent.js';
import { QualityGateAgent } from './QualityGateAgent.js';
import { sanitizeStudyCorpus, toFocusTopics } from '../StudyCorpusSanitizer.js';
import { ILanguageModelService, ContextCacheHandle } from '../../ports/ILanguageModelService.js';

export interface CoordinatorPipelineResult {
  materialId: string;
  status: string;
  summary: string;
  keyConcepts: readonly string[];
  generatedFlashcardsCount: number;
  generatedQuizId?: string;
  qualityScore: number;
}

export class PedagogicalCoordinatorAgent {
  constructor(
    private readonly evaluatorAgent: MaterialEvaluatorAgent,
    private readonly flashcardAgent: FlashcardSpecialistAgent,
    private readonly quizAgent: QuizSpecialistAgent,
    private readonly qualityGateAgent: QualityGateAgent,
    private readonly aiService?: ILanguageModelService
  ) {}

  public async orchestrateProcessing(
    material: Material,
    rawText: string,
    fileInput?: { fileBase64?: string; mimeType?: string; fileName?: string }
  ): Promise<CoordinatorPipelineResult> {
    const studyText = sanitizeStudyCorpus(rawText) || rawText;

    let cacheHandle: ContextCacheHandle | null = null;

    try {
      // 1. Criação do Cache Centralizado de Contexto (GoogleAICacheManager)
      if (this.aiService?.createContextCache) {
        cacheHandle = await this.aiService.createContextCache({
          mimeType: 'text/plain',
          textContent: studyText,
          fileName: fileInput?.fileName || material.title,
        });
      }

      // 2. Etapa 1: Invocação do MaterialEvaluatorAgent (Análise + Resumo + RAG especifico)
      const analysis = await this.evaluatorAgent.evaluateAndIndex(
        material.id,
        material.studentId,
        studyText,
        cacheHandle
      );

      const focusTopics = toFocusTopics(analysis.keyConcepts);

      // 3. Loop Autônomo de Qualidade e Reajuste Pedagógico (até 3 tentativas)
      let flashcards: any[] = [];
      let quiz: any = null;
      let qualityResult: any = { passed: false, score: 0, reason: '' };
      const maxQualityRetries = 3;

      for (let attempt = 1; attempt <= maxQualityRetries; attempt++) {
        flashcards = await this.flashcardAgent.generateFlashcards(
          material.id,
          material.studentId,
          studyText,
          [material.subject, ...analysis.keyConcepts].filter((item): item is string => Boolean(item)),
          focusTopics,
          false,
          cacheHandle,
          8
        );

        quiz = await this.quizAgent.generateQuiz(
          material.id,
          material.studentId,
          material.title,
          studyText,
          focusTopics,
          false,
          cacheHandle
        );

        qualityResult = this.qualityGateAgent.evaluateQuality(
          analysis.summary,
          analysis.keyConcepts,
          flashcards,
          quiz
        );

        if (qualityResult.passed) {
          break;
        }
      }

      if (!qualityResult.passed && flashcards.length === 0 && !quiz) {
        throw new Error(`Falha no controle de qualidade pedagógico após ${maxQualityRetries} tentativas: ${qualityResult.reason}`);
      }

      await this.flashcardAgent.persistFlashcards(flashcards);
      await this.quizAgent.persistQuiz(quiz);

      material.completeProcessing(analysis.summary, analysis.keyConcepts);

      return {
        materialId: material.id,
        status: material.status,
        summary: analysis.summary,
        keyConcepts: analysis.keyConcepts,
        generatedFlashcardsCount: flashcards.length,
        generatedQuizId: quiz?.id,
        qualityScore: qualityResult.score,
      };
    } finally {
      // 5. Limpeza Completa (Cleanup de Cache E Arquivo) no bloco finally
      if (cacheHandle && this.aiService?.deleteContextCache) {
        await this.aiService.deleteContextCache(cacheHandle);
      }
    }
  }
}
