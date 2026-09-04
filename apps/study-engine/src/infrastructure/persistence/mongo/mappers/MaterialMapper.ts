import { Material } from '../../../../domain/entities/Material.js';
import { MaterialMongoDocument } from '../schemas/MaterialMongoDocument.js';

export class MaterialMapper {
  public static toDomain(doc: MaterialMongoDocument): Material {
    return Material.reconstitute({
      id: doc._id,
      studentId: doc.studentId,
      title: doc.title,
      format: doc.format,
      fileUrl: doc.fileUrl,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      status: doc.status,
      rawContent: doc.rawContent,
      summary: doc.summary,
      keyConcepts: doc.keyConcepts,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      processedAt: doc.processedAt,
    });
  }

  public static toPersistence(entity: Material): MaterialMongoDocument {
    return {
      _id: entity.id,
      studentId: entity.studentId,
      title: entity.title,
      format: entity.format,
      fileUrl: entity.fileUrl,
      fileSizeBytes: entity.fileSizeBytes,
      mimeType: entity.mimeType,
      status: entity.status,
      rawContent: entity.rawContent,
      summary: entity.summary,
      keyConcepts: [...entity.keyConcepts],
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      processedAt: entity.processedAt,
    };
  }
}
