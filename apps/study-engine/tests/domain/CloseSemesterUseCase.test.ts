import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloseSemesterUseCase } from '../../src/domain/usecases/CloseSemesterUseCase.js';
import { Material } from '../../src/domain/entities/Material.js';
import {
  IMaterialRepository,
  IStorageProvider,
  IVectorRepository,
} from '../../src/domain/ports/index.js';

describe('CloseSemesterUseCase', () => {
  let materialRepository: IMaterialRepository;
  let storageProvider: IStorageProvider;
  let vectorRepository: IVectorRepository;
  let useCase: CloseSemesterUseCase;

  beforeEach(() => {
    materialRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStudentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteManyByIds: vi.fn(),
    };

    storageProvider = {
      upload: vi.fn(),
      delete: vi.fn(),
      deleteBatch: vi.fn(),
    };

    vectorRepository = {
      deleteEmbeddingsByMaterialIds: vi.fn(),
      deleteEmbeddingsByStudentId: vi.fn(),
    };

    useCase = new CloseSemesterUseCase(materialRepository, storageProvider, vectorRepository);
  });

  it('should throw an error if studentId is empty', async () => {
    await expect(useCase.execute({ studentId: '' })).rejects.toThrow('Student ID is required to close semester');
  });

  it('should return 0 deleted items if student has no materials in the semester', async () => {
    vi.mocked(materialRepository.findByStudentId).mockResolvedValue([]);

    const result = await useCase.execute({ studentId: 'student-123' });

    expect(result.success).toBe(true);
    expect(result.deletedMaterialsCount).toBe(0);
    expect(result.deletedStorageFilesCount).toBe(0);
    expect(storageProvider.deleteBatch).not.toHaveBeenCalled();
    expect(vectorRepository.deleteEmbeddingsByMaterialIds).not.toHaveBeenCalled();
  });

  it('should delete storage files, RAG embeddings, and MongoDB records when closing semester', async () => {
    const mat1 = Material.create({
      studentId: 'student-123',
      title: 'Prova de Cálculo 1',
      format: 'IMAGE',
      fileUrl: 'materials/mat-1.jpg',
      fileSizeBytes: 1024,
      mimeType: 'image/jpeg',
    });

    const mat2 = Material.create({
      studentId: 'student-123',
      title: 'Apostila de Física',
      format: 'PDF',
      fileUrl: 'materials/mat-2.pdf',
      fileSizeBytes: 2048,
      mimeType: 'application/pdf',
    });

    vi.mocked(materialRepository.findByStudentId).mockResolvedValue([mat1, mat2]);

    const result = await useCase.execute({ studentId: 'student-123' });

    expect(result.success).toBe(true);
    expect(result.deletedMaterialsCount).toBe(2);
    expect(result.deletedStorageFilesCount).toBe(2);

    expect(storageProvider.deleteBatch).toHaveBeenCalledWith(['materials/mat-1.jpg', 'materials/mat-2.pdf']);
    expect(vectorRepository.deleteEmbeddingsByMaterialIds).toHaveBeenCalledWith([mat1.id, mat2.id]);
    expect(materialRepository.deleteManyByIds).toHaveBeenCalledWith([mat1.id, mat2.id]);
  });
});
