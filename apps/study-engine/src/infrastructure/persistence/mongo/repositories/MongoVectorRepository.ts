import { Collection, Db } from 'mongodb';
import { IVectorRepository } from '../../../../domain/ports/IVectorRepository.js';

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

  public async deleteEmbeddingsByMaterialIds(materialIds: string[]): Promise<void> {
    if (!materialIds || materialIds.length === 0) return;
    await this.collection.deleteMany({ materialId: { $in: materialIds } });
  }

  public async deleteEmbeddingsByStudentId(studentId: string): Promise<void> {
    if (!studentId) return;
    await this.collection.deleteMany({ studentId });
  }
}
