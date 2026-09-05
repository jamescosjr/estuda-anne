import { Material } from '../entities/Material.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
  ITranscriptionService,
  IVectorRepository,
} from '../ports/index.js';
import { MaterialEvaluatorAgent } from '../services/pedagogical-agents/MaterialEvaluatorAgent.js';
import { FlashcardSpecialistAgent } from '../services/pedagogical-agents/FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from '../services/pedagogical-agents/QuizSpecialistAgent.js';
import { QualityGateAgent } from '../services/pedagogical-agents/QualityGateAgent.js';
import { PedagogicalCoordinatorAgent } from '../services/pedagogical-agents/PedagogicalCoordinatorAgent.js';

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
  private coordinatorAgent: PedagogicalCoordinatorAgent;

  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly aiService: ILanguageModelService,
    private readonly transcriptionService: ITranscriptionService,
    private readonly vectorRepository?: IVectorRepository
  ) {
    const dummyVectorRepo: IVectorRepository = vectorRepository || {
      saveChunkEmbeddings: async () => {},
      searchRelevantChunks: async () => [],
      deleteEmbeddingsByMaterialIds: async () => {},
      deleteEmbeddingsByStudentId: async () => {},
    };

    const evaluatorAgent = new MaterialEvaluatorAgent(this.aiService, dummyVectorRepo);
    const flashcardAgent = new FlashcardSpecialistAgent(this.aiService, this.flashcardRepository);
    const quizAgent = new QuizSpecialistAgent(this.aiService, this.quizRepository);
    const qualityGateAgent = new QualityGateAgent();

    this.coordinatorAgent = new PedagogicalCoordinatorAgent(
      evaluatorAgent,
      flashcardAgent,
      quizAgent,
      qualityGateAgent
    );
  }

  public async execute(input: ProcessMaterialInput): Promise<ProcessMaterialOutput> {
    const material = await this.materialRepository.findById(input.materialId);
    if (!material) {
      throw new Error(`Material with ID ${input.materialId} not found`);
    }

    try {
      let rawText = material.rawContent;

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

      // Execução orquestrada pelo PedagogicalCoordinatorAgent
      const result = await this.coordinatorAgent.orchestrateProcessing(material, rawText);

      await this.materialRepository.update(material);

      return {
        materialId: result.materialId,
        status: result.status,
        summary: result.summary,
        keyConcepts: result.keyConcepts,
        generatedFlashcardsCount: result.generatedFlashcardsCount,
        generatedQuizId: result.generatedQuizId,
      };
    } catch (error: any) {
      material.markAsFailed(error.message || 'Unknown processing error');
      await this.materialRepository.update(material);
      throw error;
    }
  }
}
