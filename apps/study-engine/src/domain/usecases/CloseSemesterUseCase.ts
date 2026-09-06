import {
  IMaterialRepository,
  IStorageProvider,
  IVectorRepository,
  IFlashcardRepository,
  IQuizRepository,
  IStudyScheduleRepository,
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
    private readonly vectorRepository: IVectorRepository,
    private readonly flashcardRepository?: IFlashcardRepository,
    private readonly quizRepository?: IQuizRepository,
    private readonly scheduleRepository?: IStudyScheduleRepository
  ) {}

  public async execute(input: CloseSemesterInput): Promise<CloseSemesterOutput> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('Student ID is required to close semester');
    }

    const materials = await this.materialRepository.findByStudentId(input.studentId);
    const materialIds = materials.map(m => m.id);
    const fileKeys = materials.map(m => m.fileUrl).filter(url => Boolean(url));

    if (fileKeys.length > 0) {
      await this.storageProvider.deleteBatch(fileKeys);
    }

    await this.vectorRepository.deleteEmbeddingsByStudentId(input.studentId);

    if (this.flashcardRepository) {
      await this.flashcardRepository.deleteByStudentId(input.studentId);
    }
    if (this.quizRepository) {
      await this.quizRepository.deleteByStudentId(input.studentId);
    }
    if (this.scheduleRepository) {
      await this.scheduleRepository.deleteByStudentId(input.studentId);
    }

    if (materialIds.length > 0) {
      await this.materialRepository.deleteManyByIds(materialIds);
    }

    return {
      studentId: input.studentId,
      deletedMaterialsCount: materialIds.length,
      deletedStorageFilesCount: fileKeys.length,
      success: true,
    };
  }
}
