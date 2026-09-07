import { Material } from '../../entities/Material.js';
import { MaterialEvaluatorAgent } from './MaterialEvaluatorAgent.js';
import { FlashcardSpecialistAgent } from './FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from './QuizSpecialistAgent.js';
import { QualityGateAgent } from './QualityGateAgent.js';
import { sanitizeStudyCorpus, toFocusTopics } from '../StudyCorpusSanitizer.js';

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
    private readonly qualityGateAgent: QualityGateAgent
  ) {}

  public async orchestrateProcessing(material: Material, rawText: string): Promise<CoordinatorPipelineResult> {
    const studyText = sanitizeStudyCorpus(rawText) || rawText;

    // 1. Etapa 1: Invocação do MaterialEvaluatorAgent (Análise + Resumo + RAG especifico)
    const analysis = await this.evaluatorAgent.evaluateAndIndex(
      material.id,
      material.studentId,
      studyText
    );

    const focusTopics = toFocusTopics(analysis.keyConcepts);

    // 2. Etapa 2: Invocação do FlashcardSpecialistAgent (Cartões pedagógicos de retenção)
    const flashcards = await this.flashcardAgent.generateFlashcards(
      material.id,
      material.studentId,
      studyText,
      analysis.keyConcepts,
      focusTopics,
      false
    );

    const quiz = await this.quizAgent.generateQuiz(
      material.id,
      material.studentId,
      material.title,
      studyText,
      focusTopics,
      false
    );

    const qualityResult = this.qualityGateAgent.evaluateQuality(
      analysis.summary,
      analysis.keyConcepts,
      flashcards,
      quiz
    );

    if (!qualityResult.passed) {
      throw new Error(`Falha no controle de qualidade pedagógico: ${qualityResult.reason}`);
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
  }
}
