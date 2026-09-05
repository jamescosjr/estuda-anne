import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  IVectorRepository,
  IStorageProvider,
} from '../ports/index.js';

export interface DeleteMaterialInput {
  materialId: string;
  studentId?: string;
}

export class DeleteMaterialUseCase {
  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly vectorRepository: IVectorRepository,
    private readonly storageProvider?: IStorageProvider
  ) {}

  public async execute(input: DeleteMaterialInput): Promise<{ success: boolean; id: string }> {
    const material = await this.materialRepository.findById(input.materialId);

    if (material) {
      // 1. Limpa flashcards vinculados ao material
      const flashcards = await this.flashcardRepository.findByMaterialId(input.materialId);
      for (const fc of flashcards) {
        await this.flashcardRepository.delete(fc.id);
      }

      // 2. Limpa quizzes vinculados ao material
      const quizzes = await this.quizRepository.findByMaterialId(input.materialId);
      for (const q of quizzes) {
        await this.quizRepository.delete(q.id);
      }

      // 3. Limpa embeddings vetoriais do RAG específico
      await this.vectorRepository.deleteEmbeddingsByMaterialIds([input.materialId]);

      // 4. Remove arquivo do storage se houver chave válida
      if (this.storageProvider && material.fileUrl) {
        try {
          await this.storageProvider.delete(material.fileUrl);
        } catch {
          // Ignora se arquivo já foi excluído
        }
      }

      // 5. Remove documento do repositório principal de materiais
      await this.materialRepository.delete(input.materialId);
    }

    return { success: true, id: input.materialId };
  }
}
