import { Collection, Db } from 'mongodb';
import { Material } from '../../../../domain/entities/Material.js';
import { IMaterialRepository } from '../../../../domain/ports/IMaterialRepository.js';
import { MaterialMongoDocument } from '../schemas/MaterialMongoDocument.js';
import { MaterialMapper } from '../mappers/MaterialMapper.js';

export class MongoMaterialRepository implements IMaterialRepository {
  private collection: Collection<MaterialMongoDocument>;

  constructor(db: Db) {
    this.collection = db.collection<MaterialMongoDocument>('materials');
  }

  public async save(material: Material): Promise<void> {
    const doc = MaterialMapper.toPersistence(material);
    await this.collection.insertOne(doc);
  }

  public async findById(id: string): Promise<Material | null> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return MaterialMapper.toDomain(doc);
  }

  public async findByStudentId(studentId: string, limit = 100, skip = 0): Promise<Material[]> {
    const docs = await this.collection
      .find({ studentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return docs.map(MaterialMapper.toDomain);
  }

  public async update(material: Material): Promise<void> {
    const doc = MaterialMapper.toPersistence(material);
    await this.collection.replaceOne({ _id: material.id }, doc, { upsert: true });
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  public async deleteManyByIds(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.collection.deleteMany({ _id: { $in: ids } });
  }
}
