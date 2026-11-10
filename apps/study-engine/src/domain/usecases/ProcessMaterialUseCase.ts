import { Material } from '../entities/Material.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
  ITranscriptionService,
  IVectorRepository,
  IContentExtractor,
} from '../ports/index.js';
import { MaterialEvaluatorAgent } from '../services/pedagogical-agents/MaterialEvaluatorAgent.js';
import { FlashcardSpecialistAgent } from '../services/pedagogical-agents/FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from '../services/pedagogical-agents/QuizSpecialistAgent.js';
import { QualityGateAgent } from '../services/pedagogical-agents/QualityGateAgent.js';
import { PedagogicalCoordinatorAgent } from '../services/pedagogical-agents/PedagogicalCoordinatorAgent.js';
import { isUnusableStudyCorpus } from '../services/StudyCorpusSanitizer.js';
import { DomainRuleViolation } from '../errors/DomainError.js';

export interface ProcessMaterialInput {
  materialId: string;
  textContent?: string;
  force?: boolean;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
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
    private readonly vectorRepository?: IVectorRepository,
    private readonly contentExtractor?: IContentExtractor
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
      qualityGateAgent,
      this.aiService
    );
  }

  public async execute(input: ProcessMaterialInput): Promise<ProcessMaterialOutput> {
    const material = await this.materialRepository.findById(input.materialId);
    if (!material) {
      throw new Error(`Material with ID ${input.materialId} not found`);
    }

    try {
      if (material.isReady() && !input.force) {
        const existingCards = await this.flashcardRepository.findByMaterialId(material.id);
        const existingQuizzes = await this.quizRepository.findByMaterialId(material.id);
        if (existingCards.length > 0) {
          return {
            materialId: material.id,
            status: material.status,
            summary: material.summary,
            keyConcepts: material.keyConcepts,
            generatedFlashcardsCount: existingCards.length,
            generatedQuizId: existingQuizzes[0]?.id,
          };
        }
      }

      let rawText = input.textContent?.trim() || material.rawContent || '';
      if (isUnusableStudyCorpus(rawText)) {
        rawText = '';
      }

      if ((!rawText || rawText.trim().length === 0) && input.fileBase64) {
        if (this.contentExtractor) {
          material.startExtraction();
          await this.materialRepository.update(material);
          rawText = await this.contentExtractor.extractText({
            fileBase64: input.fileBase64,
            mimeType: input.mimeType || material.mimeType,
            fileName: input.fileName || material.title,
          });
          if (isUnusableStudyCorpus(rawText)) {
            rawText = '';
          }
        }

        const mime = (input.mimeType || material.mimeType || '').toLowerCase();
        const canUseVision = mime.includes('pdf') || mime.includes('image');
        if ((!rawText || rawText.trim().length === 0) && canUseVision && this.aiService.extractTextFromMultimodalDocument) {
          try {
            rawText = await this.aiService.extractTextFromMultimodalDocument({
              mimeType: input.mimeType || material.mimeType,
              dataBase64: input.fileBase64,
            });
          } catch (extractError: any) {
            const message = extractError?.message || String(extractError);
            if (/RECITATION|blocked due to/i.test(message)) {
              throw new Error(
                'O Gemini bloqueou a leitura do PDF por semelhança com obra protegida. Envie um .docx ou um PDF com texto selecionável (não digitalizado).'
              );
            }
            throw extractError;
          }
        }
      }

      if (material.isAudioOrVideo() && !rawText) {
        material.startTranscription();
        await this.materialRepository.update(material);

        const transcription = await this.transcriptionService.transcribe(
          material.fileUrl,
          material.mimeType
        );
        rawText = transcription.text;
      }

      if (!rawText || rawText.trim().length === 0 || isUnusableStudyCorpus(rawText)) {
        throw new DomainRuleViolation(
          'RN-STU-005',
          'corpus_invalido_ou_inseguro: Não foi possível extrair texto do arquivo (PDF sem camada de texto, DOCX/ZIP binário ou digitalizado). Envie um documento com texto selecionável ou um .docx válido.'
        );
      }

      material.setRawContent(rawText);
      await this.materialRepository.update(material);

      // Execução orquestrada pelo PedagogicalCoordinatorAgent com suporte a Gemini Context Caching
      const result = await this.coordinatorAgent.orchestrateProcessing(material, rawText, {
        mimeType: input.mimeType || material.mimeType,
        fileName: input.fileName || material.title,
      });

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
