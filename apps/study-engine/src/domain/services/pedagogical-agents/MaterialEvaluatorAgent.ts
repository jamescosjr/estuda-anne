import { ILanguageModelService, MaterialAnalysisResult, ContextCacheHandle } from '../../ports/ILanguageModelService.js';
import { IVectorRepository } from '../../ports/IVectorRepository.js';
import { lexicalEmbedding } from '../LexicalEmbedding.js';

export class MaterialEvaluatorAgent {
  constructor(
    private readonly aiService: ILanguageModelService,
    private readonly vectorRepository: IVectorRepository
  ) {}

  public async evaluateAndIndex(
    materialId: string,
    studentId: string,
    rawText: string,
    cacheHandle?: ContextCacheHandle | null
  ): Promise<MaterialAnalysisResult> {
    // 1. Análise conceitual e resumo pedagógico com a IA (utilizando cache se fornecido)
    const analysis = await this.aiService.extractConceptsAndSummary(rawText, { cacheHandle });

    // 2. Fragmentação do texto em chunks para o RAG do material
    const chunkSize = 600;
    const textChunks: string[] = [];
    for (let i = 0; i < rawText.length; i += chunkSize) {
      textChunks.push(rawText.slice(i, i + chunkSize));
    }

    // 3. Alimentação do banco de dados RAG específico para este material
    if (textChunks.length > 0) {
      await this.vectorRepository.saveChunkEmbeddings(
        materialId,
        studentId,
        textChunks.map((chunk) => ({
          textChunk: chunk,
          embedding: lexicalEmbedding(chunk),
        }))
      );
    }

    return analysis;
  }
}
