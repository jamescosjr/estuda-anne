import { Collection, Db } from 'mongodb';
import { IVectorRepository, MaterialChunkEmbeddingsInput } from '../../../../domain/ports/IVectorRepository.js';

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
    const filter: Record<string, any> = { studentId };
    if (materialId) {
      filter.materialId = materialId;
    }

    if (query && query.trim().length > 0) {
      const searchRegex = new RegExp(query.trim(), 'i');
      filter.textChunk = searchRegex;
    }

    const docs = await this.collection.find(filter).limit(limit).toArray();
    return docs.map((d) => ({ textChunk: d.textChunk }));
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
