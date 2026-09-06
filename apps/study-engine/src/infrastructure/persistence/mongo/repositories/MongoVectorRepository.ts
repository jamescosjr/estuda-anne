import { Collection, Db } from 'mongodb';
import { IVectorRepository, MaterialChunkEmbeddingsInput } from '../../../../domain/ports/IVectorRepository.js';
import { cosineSimilarity, lexicalEmbedding } from '../../../../domain/services/LexicalEmbedding.js';

interface VectorDocument {
  _id: string;
  materialId: string;
  studentId: string;
  embedding: number[];
  textChunk: string;
  createdAt: Date;
}

export class MongoVectorRepository implements IVectorRepository {
  private collection: Collection<VectorDocument>;

  constructor(db: Db) {
    this.collection = db.collection<VectorDocument>('material_embeddings');
  }

  public async saveChunkEmbeddings(
    materialId: string,
    studentId: string,
    chunks: MaterialChunkEmbeddingsInput[]
  ): Promise<void> {
    if (!chunks || chunks.length === 0) return;

    const documents: VectorDocument[] = chunks.map((chunk, index) => ({
      _id: `vec-${materialId}-${index}-${Date.now()}`,
      materialId,
      studentId,
      embedding: chunk.embedding || [],
      textChunk: chunk.textChunk,
      createdAt: new Date(),
    }));

    await this.collection.insertMany(documents);
  }

  public async searchRelevantChunks(
    studentId: string,
    materialId: string,
    query: string,
    limit = 5
  ): Promise<Array<{ textChunk: string }>> {
    const filter: Record<string, unknown> = { studentId };
    if (materialId) {
      filter.materialId = materialId;
    }

    const docs = await this.collection.find(filter).toArray();
    if (docs.length === 0) return [];

    const queryEmbedding = lexicalEmbedding(query || '');
    const ranked = docs
      .map((doc) => ({
        textChunk: doc.textChunk,
        score: doc.embedding?.length
          ? cosineSimilarity(queryEmbedding, doc.embedding)
          : (query && doc.textChunk.toLowerCase().includes(query.toLowerCase()) ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map((item) => ({ textChunk: item.textChunk }));
  }

  public async deleteEmbeddingsByMaterialIds(materialIds: string[]): Promise<void> {
    if (!materialIds || materialIds.length === 0) return;
    await this.collection.deleteMany({ materialId: { $in: materialIds } });
  }

  public async deleteEmbeddingsByStudentId(studentId: string): Promise<void> {
    if (!studentId) return;
    await this.collection.deleteMany({ studentId });
  }
}
