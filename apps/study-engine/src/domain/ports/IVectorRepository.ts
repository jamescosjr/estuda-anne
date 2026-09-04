export interface IVectorRepository {
  deleteEmbeddingsByMaterialIds(materialIds: string[]): Promise<void>;
  deleteEmbeddingsByStudentId(studentId: string): Promise<void>;
}
