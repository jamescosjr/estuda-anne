import {
  IMaterialRepository,
  IStorageProvider,
  IVectorRepository,
} from '../ports/index.js';

export interface CloseSemesterInput {
  studentId: string;
}

export interface CloseSemesterOutput {
  studentId: string;
  deletedMaterialsCount: number;
  deletedStorageFilesCount: number;
  success: boolean;
}

export class CloseSemesterUseCase {
  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly storageProvider: IStorageProvider,
    private readonly vectorRepository: IVectorRepository
  ) {}

  public async execute(input: CloseSemesterInput): Promise<CloseSemesterOutput> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('Student ID is required to close semester');
    }

    const materials = await this.materialRepository.findByStudentId(input.studentId);
    if (materials.length === 0) {
      return {
        studentId: input.studentId,
        deletedMaterialsCount: 0,
        deletedStorageFilesCount: 0,
        success: true,
      };
    }

    const materialIds = materials.map(m => m.id);
    const fileKeys = materials.map(m => m.fileUrl).filter(url => Boolean(url));

    // 1. Apaga os arquivos binários no Cloudflare R2
    if (fileKeys.length > 0) {
      await this.storageProvider.deleteBatch(fileKeys);
    }

    // 2. Apaga os embeddings vetoriais no RAG
    await this.vectorRepository.deleteEmbeddingsByMaterialIds(materialIds);

    // 3. Limpa os metadados dos materiais no banco de dados
    await this.materialRepository.deleteManyByIds(materialIds);

    return {
      studentId: input.studentId,
      deletedMaterialsCount: materialIds.length,
      deletedStorageFilesCount: fileKeys.length,
      success: true,
    };
  }
}
