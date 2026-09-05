export interface MaterialChunkEmbeddingsInput {
  textChunk: string;
  embedding?: number[];
}

export interface IVectorRepository {
  saveChunkEmbeddings(materialId: string, studentId: string, chunks: MaterialChunkEmbeddingsInput[]): Promise<void>;
  searchRelevantChunks(studentId: string, materialId: string, query: string, limit?: number): Promise<Array<{ textChunk: string }>>;
  deleteEmbeddingsByMaterialIds(materialIds: string[]): Promise<void>;
  deleteEmbeddingsByStudentId(studentId: string): Promise<void>;
}
